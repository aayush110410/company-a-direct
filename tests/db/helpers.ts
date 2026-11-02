import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { afterAll, beforeAll } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!url || !anonKey || !serviceKey || !dbUrl) {
  throw new Error("DB tests need a running local Supabase and .env.local (see deployment.md).");
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient(url, serviceKey, noSession);
export const anon = () => createClient(url, anonKey, noSession);

const pool = new pg.Pool({ connectionString: dbUrl, max: 4 });
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  return (await pool.query<T>(text, params)).rows;
}

/** Pause the live minute job so it cannot race assertions; restore it afterwards. */
export function pauseCronDuringTests() {
  beforeAll(async () => {
    await sql("select cron.unschedule('order-jobs') where exists (select 1 from cron.job where jobname = 'order-jobs')");
  });
  afterAll(async () => {
    await sql("select cron.schedule('order-jobs', '* * * * *', $$select public.run_order_jobs()$$)");
    await pool.end();
  });
}

const tag = () => randomUUID().slice(0, 8);

export async function makeOutlet(): Promise<{ cityId: string; outletId: string }> {
  const t = tag();
  const [city] = await sql<{ id: string }>("insert into cities (name, slug) values ($1, $2) returning id", [`Test ${t}`, `test-${t}`]);
  const [outlet] = await sql<{ id: string }>(
    `insert into outlets (city_id, name, slug, area, lat, lng, delivery_radius_km, fssai_licence)
     values ($1, $2, $3, 'Test area', 17.47, 78.357, 5, '10000000000001') returning id`,
    [city!.id, `Outlet ${t}`, `outlet-${t}`],
  );
  return { cityId: city!.id, outletId: outlet!.id };
}

type Role = "customer" | "kitchen_staff" | "outlet_manager" | "admin";

export async function createUser(
  role: Role,
  opts: { outletId?: string; phone?: string; metadata?: Record<string, unknown> } = {},
): Promise<{ client: SupabaseClient; userId: string }> {
  const email = `${role}-${tag()}@test.example.com`;
  const password = "Test@12345";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: opts.metadata ?? {},
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
  const userId = created.data.user.id;

  if (role !== "customer" || opts.phone) {
    await sql("update profiles set role = $2, outlet_id = $3, phone = $4 where id = $1", [
      userId,
      role,
      opts.outletId ?? null,
      opts.phone ?? null,
    ]);
  }

  const client = anon();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { client, userId };
}

export async function makeMenuItem(): Promise<{ itemId: string; portionId: string }> {
  const t = tag();
  const [cat] = await sql<{ id: string }>("insert into categories (name, slug) values ('Test', $1) returning id", [`cat-${t}`]);
  const [item] = await sql<{ id: string }>(
    `insert into menu_items (category_id, name, slug, photo_url, diet, base_prep_minutes)
     values ($1, 'Test biryani', $2, 'https://images.unsplash.com/photo-test', 'non_veg', 18) returning id`,
    [cat!.id, `item-${t}`],
  );
  const [portion] = await sql<{ id: string }>(
    "insert into item_portions (item_id, name) values ($1, 'Single') returning id",
    [item!.id],
  );
  return { itemId: item!.id, portionId: portion!.id };
}

/** Inserts an order (plus contact and payment) directly; tests then drive it through the RPCs. */
export async function makeOrder(o: {
  customerId: string;
  outletId: string;
  status?: string;
  placedAt?: string;
  promisedAt?: string;
  handedAt?: string | null;
  travelMinutes?: number;
  paidAt?: string | null;
}): Promise<string> {
  const [row] = await sql<{ id: string }>(
    `insert into orders (customer_id, outlet_id, status, subtotal_paise, discount_paise, total_paise, gst_paise,
       payment_method, distance_km, travel_minutes, placed_at, paid_at, promised_at, ready_by, handed_at)
     values ($1, $2, $3, 34000, 0, 34000, 1619, 'upi', 2.5, $4, $5, $6, $7, $7::timestamptz - make_interval(mins => $4), $8)
     returning id`,
    [
      o.customerId,
      o.outletId,
      o.status ?? "placed",
      o.travelMinutes ?? 12,
      o.placedAt ?? new Date().toISOString(),
      o.paidAt === undefined ? new Date().toISOString() : o.paidAt,
      o.promisedAt ?? new Date(Date.now() + 40 * 60_000).toISOString(),
      o.handedAt ?? null,
    ],
  );
  await sql("insert into order_contacts (order_id, customer_phone, delivery_address) values ($1, '+919000000001', 'Flat 4, Test Road, Hyderabad')", [row!.id]);
  await sql("insert into payments (order_id, method, amount_paise, status) values ($1, 'upi', 34000, $2)", [
    row!.id,
    o.status === "awaiting_payment" ? "pending" : "succeeded",
  ]);
  return row!.id;
}

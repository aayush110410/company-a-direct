import { beforeAll, describe, expect, it } from "vitest";
import { admin, anon, createUser, makeMenuItem, makeOrder, makeOutlet, sql, pauseCronDuringTests } from "./helpers";

pauseCronDuringTests();

let outletA: string;
let outletB: string;
let orderA: string;
let orderB: string;
let customer1: Awaited<ReturnType<typeof createUser>>;
let customer2: Awaited<ReturnType<typeof createUser>>;
let kitchenA: Awaited<ReturnType<typeof createUser>>;
let adminUser: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  ({ outletId: outletA } = await makeOutlet());
  ({ outletId: outletB } = await makeOutlet());
  customer1 = await createUser("customer");
  customer2 = await createUser("customer");
  kitchenA = await createUser("kitchen_staff", { outletId: outletA });
  adminUser = await createUser("admin");
  orderA = await makeOrder({ customerId: customer1.userId, outletId: outletA });
  orderB = await makeOrder({ customerId: customer2.userId, outletId: outletB });
  const { itemId, portionId } = await makeMenuItem();
  await sql(
    `insert into order_items (order_id, item_id, portion_id, name_snapshot, portion_snapshot, qty, unit_price_paise, base_prep_minutes, prep_multiplier)
     values ($1, $2, $3, 'Test biryani', 'Single', 1, 34000, 18, 1)`,
    [orderA, itemId, portionId],
  );
});

describe("row-level security", () => {
  it("every public table has RLS enabled", async () => {
    const rows = await sql("select tablename from pg_tables where schemaname = 'public' and not rowsecurity");
    expect(rows).toEqual([]);
  });

  it("kitchen staff of outlet A cannot read outlet B orders", async () => {
    const { data } = await kitchenA.client.from("orders").select("id").in("id", [orderA, orderB]);
    expect(data?.map((r) => r.id)).toEqual([orderA]);
  });

  it("customers read only their own orders", async () => {
    const { data } = await customer1.client.from("orders").select("id").in("id", [orderA, orderB]);
    expect(data?.map((r) => r.id)).toEqual([orderA]);
  });

  it("customer B cannot read customer A's order items", async () => {
    const own = await customer1.client.from("order_items").select("id").eq("order_id", orderA);
    const other = await customer2.client.from("order_items").select("id").eq("order_id", orderA);
    expect(own.data).toHaveLength(1);
    expect(other.data).toEqual([]);
  });

  it("customers cannot change an order's status", async () => {
    const { error } = await customer1.client.from("orders").update({ status: "delivered" }).eq("id", orderA);
    expect(error?.code).toBe("42501");
    const [row] = await sql<{ status: string }>("select status from orders where id = $1", [orderA]);
    expect(row?.status).toBe("placed");
  });

  it("anonymous visitors can read the menu but not orders", async () => {
    const client = anon();
    expect((await client.from("outlets").select("id").eq("id", outletA)).data).toHaveLength(1);
    expect((await client.from("orders").select("id")).data).toEqual([]);
  });

  it("anon and customers cannot write server-only tables", async () => {
    for (const client of [anon(), customer1.client]) {
      const writes = await Promise.all([
        client.from("payments").insert({ order_id: orderA, method: "upi", amount_paise: 1 }),
        client.from("order_events").insert({ order_id: orderA, to_status: "delivered" }),
        client.from("outbox_messages").insert({ channel: "sms", to_phone: "x", purpose: "marketing", template: "x", body: "x" }),
      ]);
      for (const w of writes) expect(w.error?.code).toBe("42501");
    }
  });

  it("kitchen staff and admins cannot read contact details or the outbox", async () => {
    for (const user of [kitchenA, adminUser]) {
      expect((await user.client.from("order_contacts").select("*").eq("order_id", orderA)).data).toEqual([]);
      expect((await user.client.from("outbox_messages").select("*")).data).toEqual([]);
    }
  });

  it("customers read only their own contact details", async () => {
    expect((await customer1.client.from("order_contacts").select("order_id").eq("order_id", orderA)).data).toHaveLength(1);
    expect((await customer2.client.from("order_contacts").select("order_id").eq("order_id", orderA)).data).toEqual([]);
  });

  it("nobody can list coupon codes from the browser", async () => {
    await sql(
      "insert into coupons (code, kind, value, valid_from, valid_to) values ('RLSTEST', 'flat', 100, now() - interval '1 day', now() + interval '1 day') on conflict do nothing",
    );
    expect((await anon().from("coupons").select("code")).data).toEqual([]);
    expect((await customer1.client.from("coupons").select("code")).data).toEqual([]);
  });

  it("admins cannot read other users' profiles through the browser client", async () => {
    const { data } = await adminUser.client.from("profiles").select("id").eq("id", customer1.userId);
    expect(data).toEqual([]);
  });
});

describe("profiles and roles", () => {
  it("customers cannot change their own role", async () => {
    const { error } = await customer1.client.from("profiles").update({ role: "admin" }).eq("id", customer1.userId);
    expect(error?.code).toBe("42501");
    const [row] = await sql<{ role: string }>("select role from profiles where id = $1", [customer1.userId]);
    expect(row?.role).toBe("customer");
  });

  it("a self sign-up that asks for admin still gets a customer profile", async () => {
    const email = `signup-${Date.now()}@test.example.com`;
    const { data, error } = await anon().auth.signUp({
      email,
      password: "Test@12345",
      options: { data: { role: "admin", outlet_id: outletA, full_name: "Sneaky" } },
    });
    expect(error).toBeNull();
    const [row] = await sql<{ role: string; outlet_id: string | null; full_name: string }>(
      "select role, outlet_id, full_name from profiles where id = $1",
      [data.user!.id],
    );
    expect(row).toEqual({ role: "customer", outlet_id: null, full_name: "Sneaky" });
  });
});

describe("privileged functions", () => {
  it("cannot be called from the browser", async () => {
    const calls = await Promise.all([
      customer1.client.rpc("transition_order", { p_order_id: orderA, p_from: "placed", p_to: "preparing", p_actor: customer1.userId }),
      kitchenA.client.rpc("transition_order", { p_order_id: orderA, p_from: "placed", p_to: "preparing", p_actor: kitchenA.userId }),
      anon().rpc("run_order_jobs", { p_now: "2099-01-01T00:00:00Z" }),
      customer1.client.rpc("confirm_payment", {
        p_order_id: orderA,
        p_promised_at: new Date().toISOString(),
        p_ready_by: new Date().toISOString(),
        p_estimate: {},
        p_message: null,
      }),
    ]);
    for (const c of calls) expect(c.error?.code).toBe("42501");
    const [row] = await sql<{ status: string }>("select status from orders where id = $1", [orderA]);
    expect(row?.status).toBe("placed");
  });

  it("are callable by the service role", async () => {
    const { error } = await admin.rpc("run_order_jobs", { p_order_ids: ["none"] });
    expect(error).toBeNull();
  });
});

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { type ActionResult, fail, ok } from "@/lib/result";
import { makeMenuItemSchema } from "@/server/admin/menu-schema";
import { requireActionRole } from "@/server/auth";
import { loadDemoCatalog } from "@/server/demo/catalog";
import { insertPaidOrder } from "@/server/demo/insert-paid-order";
import { findUserIdByEmail, resetDemoData } from "@/server/demo/reset";
import { simulateRushCore } from "@/server/demo/simulate-rush";
import { serverEnv } from "@/server/env";
import { loadActiveModel } from "@/server/model-store";
import { rateLimit } from "@/server/rate-limit";
import { createAdminClient } from "@/server/supabase/admin";

async function asAdmin<T>(run: (userId: string) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const auth = await requireActionRole(["admin"]);
    if (!auth.ok) return auth;
    return await run(auth.data.userId);
  } catch (e) {
    unstable_rethrow(e);
    console.error(e);
    return fail("Something went wrong. Nothing was saved; try again.");
  }
}

export async function saveMenuItem(input: unknown): Promise<ActionResult<{ itemId: string }>> {
  return asAdmin(async () => {
    const db = createAdminClient();
    const { data: cities } = await db.from("cities").select("id");
    const parsed = makeMenuItemSchema((cities ?? []).map((c) => c.id)).safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      return fail(issue.message, issue.path.join("."));
    }
    const m = parsed.data;
    const slug = `${m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomUUID().slice(0, 4)}`;

    const fields = {
      name: m.name,
      description: m.description,
      diet: m.diet,
      spice_level: m.spiceLevel,
      allergens: m.allergens,
      base_prep_minutes: m.basePrepMinutes,
      category_id: m.categoryId,
      schedule_id: m.scheduleId,
      photo_url: m.photoUrl,
      photo_credit: m.photoCredit,
      updated_at: new Date().toISOString(),
    };
    // Update in place for an existing dish (its slug never changes); insert with a fresh slug for a new one.
    const { data: item, error } = m.id
      ? await db.from("menu_items").update(fields).eq("id", m.id).select("id").single()
      : await db.from("menu_items").insert({ ...fields, slug }).select("id").single();
    if (error || !item) {
      console.error("save menu item", error);
      return fail("Couldn't save this dish. Check the fields and try again.");
    }

    // Portions: update kept ones, add new ones, remove dropped ones (unless past orders use them).
    const { data: existing } = await db.from("item_portions").select("id").eq("item_id", item.id);
    const keep = new Set(m.portions.flatMap((p) => (p.id ? [p.id] : [])));
    for (const old of existing ?? []) {
      if (keep.has(old.id)) continue;
      const del = await db.from("item_portions").delete().eq("id", old.id);
      if (del.error) return fail("A removed portion has past orders, so it can't be deleted. Rename it instead.", "portions");
    }
    for (const [sort, p] of m.portions.entries()) {
      const { data: portion, error: pErr } = await db
        .from("item_portions")
        .upsert({ ...(p.id ? { id: p.id } : {}), item_id: item.id, name: p.name, prep_multiplier: p.prepMultiplier, sort })
        .select("id")
        .single();
      if (pErr || !portion) return fail(`Couldn't save portion ${p.name}`);
      const prices = Object.entries(p.prices).map(([city_id, rupees]) => ({ portion_id: portion.id, city_id, price_paise: rupees * 100 }));
      const pr = await db.from("item_prices").upsert(prices);
      if (pr.error) return fail(`Couldn't save prices for ${p.name}`);
    }

    const keepAddons = new Set(m.addons.flatMap((a) => (a.id ? [a.id] : [])));
    const { data: oldAddons } = await db.from("addons").select("id").eq("item_id", item.id);
    const dropped = (oldAddons ?? []).filter((a) => !keepAddons.has(a.id)).map((a) => a.id);
    if (dropped.length) await db.from("addons").delete().in("id", dropped);
    if (m.addons.length) {
      await db.from("addons").upsert(
        m.addons.map((a, sort) => ({ ...(a.id ? { id: a.id } : {}), item_id: item.id, name: a.name, price_paise: a.priceRupees * 100, diet: a.diet, sort })),
      );
    }

    revalidatePath("/", "layout");
    return ok({ itemId: item.id });
  });
}

export async function setAvailability(input: unknown) {
  return asAdmin(async (userId) => {
    const p = z.object({ itemId: z.uuid(), outletId: z.uuid(), status: z.enum(["available", "out_of_stock", "hidden"]) }).safeParse(input);
    if (!p.success) return fail("Invalid request");
    const { error } = await createAdminClient()
      .from("outlet_item_availability")
      .upsert({ item_id: p.data.itemId, outlet_id: p.data.outletId, status: p.data.status, updated_by: userId, updated_at: new Date().toISOString() });
    if (error) return fail("Couldn't update availability");
    return ok({ status: p.data.status });
  });
}

export async function setItemActive(input: unknown) {
  return asAdmin(async () => {
    const p = z.object({ itemId: z.uuid(), isActive: z.boolean() }).safeParse(input);
    if (!p.success) return fail("Invalid request");
    const { error } = await createAdminClient().from("menu_items").update({ is_active: p.data.isActive }).eq("id", p.data.itemId);
    if (error) return fail("Couldn't update the item");
    revalidatePath("/", "layout");
    return ok({ isActive: p.data.isActive });
  });
}

const PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

/** Signed upload URL: the browser uploads straight to Storage, the bucket enforces type and size. */
export async function createPhotoUploadUrl(input: unknown) {
  return asAdmin(async (userId) => {
    const p = z
      .object({ contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().min(1).max(2_097_152, "Photos must be under 2 MB") })
      .safeParse(input);
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Use a JPEG, PNG or WebP under 2 MB");
    if (!rateLimit(`upload:${userId}`, 20, 60_000).allowed) return fail("Too many uploads. Wait a minute.");
    const path = `items/${randomUUID()}.${PHOTO_TYPES[p.data.contentType]}`;
    const storage = createAdminClient().storage.from("menu-photos");
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return fail("Couldn't prepare the upload");
    return ok({ path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl });
  });
}

export async function resetDemo() {
  return asAdmin(async () => {
    if (!serverEnv().DEMO_MODE) return fail("Demo tools are switched off");
    const ids = await resetDemoData(createAdminClient(), new Date());
    revalidatePath("/", "layout");
    return ok({ orders: ids.length });
  });
}

export async function simulateRush(input: unknown) {
  return asAdmin(async () => {
    if (!serverEnv().DEMO_MODE) return fail("Demo tools are switched off");
    const p = z.object({ outletId: z.uuid(), count: z.number().int().min(1).max(15) }).safeParse(input);
    if (!p.success) return fail("Choose an outlet and 1–15 orders");
    const db = createAdminClient();
    const r = await simulateRushCore(
      { ...p.data, now: new Date(), seed: Date.now() % 2_147_483_647 },
      {
        loadCatalog: (id) => loadDemoCatalog(db, { id }),
        loadOpenOrders: async (outletId) =>
          ((await db.from("orders").select("status").eq("outlet_id", outletId).in("status", ["placed", "preparing"])).data ?? []) as {
            status: "placed" | "preparing";
          }[],
        loadActiveModel: () => loadActiveModel(db),
        demoCustomerId: async () => (await findUserIdByEmail(db, DEMO_ACCOUNTS.customer.email)) ?? "",
        insertPaidOrder: (row) => insertPaidOrder(db, row),
      },
    );
    return ok(r);
  });
}

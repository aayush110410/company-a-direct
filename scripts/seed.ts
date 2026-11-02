/**
 * Seeds a Company A environment: cities, outlets, menu, coupons, demo accounts, a prep-time
 * model trained on synthetic history, and the brief's sample orders re-based to now.
 * Idempotent: re-running resets menu content and demo orders. Run: `pnpm seed`.
 */
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { trainPrepModel } from "@/domain/prep/model";
import { generateHistory } from "@/domain/prep/synthetic";
import { resetDemoData, findUserIdByEmail } from "@/server/demo/reset";
import { saveModel } from "@/server/model-store";
import { serverEnv } from "@/server/env";
import { adminClientForScripts } from "./lib/admin-client";
import { seedCoupons } from "./seed-data/coupons";
import { bengaluruRupees, CATEGORIES, MENU, SCHEDULES } from "./seed-data/menu";
import { CITIES, OUTLETS } from "./seed-data/outlets";

const db = adminClientForScripts();
const now = new Date();

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error || r.data === null) throw new Error(`${what}: ${r.error?.message ?? "no data"}`);
  return r.data;
}

async function main() {
  console.log("Seeding Company A…");

  // Orders reference menu portions, so clear them before menu content is rebuilt.
  must(await db.from("outbox_messages").delete().not("id", "is", null).select("id"), "clear outbox");
  must(await db.from("orders").delete().not("id", "is", null).select("id"), "clear orders");

  const cities = must(await db.from("cities").upsert([...CITIES], { onConflict: "slug" }).select("id, slug"), "cities");
  const cityId = (slug: string) => cities.find((c) => c.slug === slug)!.id;

  const outlets = must(
    await db
      .from("outlets")
      .upsert(
        OUTLETS.map((o) => ({
          slug: o.slug,
          name: o.name,
          city_id: cityId(o.city),
          kind: o.kind,
          area: o.area,
          lat: o.lat,
          lng: o.lng,
          delivery_radius_km: o.deliveryRadiusKm,
          fssai_licence: o.fssaiLicence,
          min_promise_minutes: o.minPromiseMinutes,
          capacity_slots: o.capacitySlots,
          is_accepting_orders: true,
        })),
        { onConflict: "slug" },
      )
      .select("id, slug, capacity_slots"),
    "outlets",
  );

  const schedules = must(
    await db
      .from("menu_schedules")
      .upsert(SCHEDULES.map((s) => ({ name: s.name, days: [...s.days], starts_at: s.startsAt, ends_at: s.endsAt })), { onConflict: "name" })
      .select("id, name"),
    "schedules",
  );
  const categories = must(await db.from("categories").upsert([...CATEGORIES], { onConflict: "slug" }).select("id, slug"), "categories");

  const items = must(
    await db
      .from("menu_items")
      .upsert(
        MENU.map((m, i) => ({
          slug: m.slug,
          name: m.name,
          category_id: categories.find((c) => c.slug === m.category)!.id,
          description: m.description,
          photo_url: m.photo.url,
          photo_credit: m.photo.credit,
          diet: m.diet,
          spice_level: m.spice,
          allergens: m.allergens,
          base_prep_minutes: m.basePrep,
          schedule_id: m.schedule ? schedules.find((s) => s.name === m.schedule)!.id : null,
          is_active: true,
          sort: i,
        })),
        { onConflict: "slug" },
      )
      .select("id, slug"),
    "menu items",
  );
  const itemIds = items.map((i) => i.id);
  must(await db.from("item_portions").delete().in("item_id", itemIds).select("id"), "clear portions");
  must(await db.from("addons").delete().in("item_id", itemIds).select("id"), "clear addons");
  must(await db.from("outlet_item_availability").delete().in("item_id", itemIds).select("item_id"), "clear availability");

  for (const m of MENU) {
    const itemId = items.find((i) => i.slug === m.slug)!.id;
    const portions = must(
      await db
        .from("item_portions")
        .insert(m.portions.map((p, sort) => ({ item_id: itemId, name: p.name, prep_multiplier: p.multiplier, sort })))
        .select("id, name"),
      `portions ${m.slug}`,
    );
    must(
      await db
        .from("item_prices")
        .insert(
          m.portions.flatMap((p) => {
            const portionId = portions.find((x) => x.name === p.name)!.id;
            return [
              { portion_id: portionId, city_id: cityId("hyderabad"), price_paise: p.hyderabad * 100 },
              { portion_id: portionId, city_id: cityId("bengaluru"), price_paise: bengaluruRupees(p.hyderabad) * 100 },
            ];
          }),
        )
        .select("portion_id"),
      `prices ${m.slug}`,
    );
    if (m.addons?.length) {
      must(
        await db
          .from("addons")
          .insert(m.addons.map((a, sort) => ({ item_id: itemId, name: a.name, price_paise: a.rupees * 100, diet: a.diet, sort })))
          .select("id"),
        `addons ${m.slug}`,
      );
    }
  }

  must(await db.from("coupons").upsert(seedCoupons(now), { onConflict: "code" }).select("code"), "coupons");

  // Demo accounts. The profile row comes from the auth trigger as a customer; staff roles are set here.
  const password = serverEnv().DEMO_USER_PASSWORD;
  const profileFor: Record<string, { full_name: string; phone: string | null }> = {
    customer: { full_name: "Demo Customer", phone: "+919000000001" },
    kitchen: { full_name: "Kondapur Kitchen", phone: null },
    manager: { full_name: "Kondapur Manager", phone: "+919000000002" },
    kitchenGachibowli: { full_name: "Gachibowli Kitchen", phone: null },
    admin: { full_name: "Menu Admin", phone: null },
  };
  for (const [key, acct] of Object.entries(DEMO_ACCOUNTS)) {
    let id = await findUserIdByEmail(db, acct.email);
    if (id) {
      const upd = await db.auth.admin.updateUserById(id, { password, email_confirm: true });
      if (upd.error) throw new Error(`update ${acct.email}: ${upd.error.message}`);
    } else {
      const created = await db.auth.admin.createUser({ email: acct.email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error(`create ${acct.email}: ${created.error?.message}`);
      id = created.data.user.id;
    }
    const outletId = "outletSlug" in acct ? outlets.find((o) => o.slug === acct.outletSlug)!.id : null;
    must(
      await db
        .from("profiles")
        .update({ role: acct.role, outlet_id: outletId, ...profileFor[key] })
        .eq("id", id)
        .select("id"),
      `profile ${acct.email}`,
    );
  }

  // Prep-time model: six weeks of synthetic history for every outlet (assumption A10).
  const samples = generateHistory({
    outlets: outlets.map((o) => ({ id: o.id, capacitySlots: o.capacity_slots })),
    menu: MENU.map((m) => ({ basePrepMinutes: m.basePrep, prepMultipliers: m.portions.map((p) => p.multiplier) })),
    days: 42,
    seed: 20261102,
    endAt: now,
  });
  const model = trainPrepModel(samples, { version: `seed-${now.toISOString().slice(0, 10)}`, trainedAt: now.toISOString() });
  await saveModel(db, model);
  console.table({
    "training orders": model.trainN,
    "model MAE (min)": model.mae.toFixed(2),
    "baseline: predict mean (min)": model.baselineMeanMae.toFixed(2),
    "baseline: fallback rule (min)": model.baselineRuleMae.toFixed(2),
    "residual P80 (min)": model.residualP80.toFixed(2),
  });

  const orderIds = await resetDemoData(db, now);
  console.log(`Seeded ${outlets.length} outlets, ${MENU.length} dishes, ${orderIds.length} live demo orders.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

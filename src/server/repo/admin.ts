import "server-only";
import { maskPhone } from "../outbox";
import { createAdminClient } from "../supabase/admin";

/** Admin reads use the service role; every caller has already passed requireRole(["admin"]). */

export async function getAdminLookups() {
  const db = createAdminClient();
  const [cities, categories, schedules, outlets] = await Promise.all([
    db.from("cities").select("id, name, slug").order("name"),
    db.from("categories").select("id, name, sort").order("sort"),
    db.from("menu_schedules").select("id, name, starts_at, ends_at").order("name"),
    db.from("outlets").select("id, name, slug, city_id, kind").order("name"),
  ]);
  return {
    cities: cities.data ?? [],
    categories: categories.data ?? [],
    schedules: schedules.data ?? [],
    outlets: outlets.data ?? [],
  };
}

export type AdminItemRow = {
  id: string;
  name: string;
  photoUrl: string;
  diet: "veg" | "non_veg" | "egg";
  category: string;
  categoryId: string;
  isActive: boolean;
  fromPrice: Record<string, number>;
  unavailableAt: number;
};

export async function listItems(): Promise<(AdminItemRow & { catSort: number; sort: number })[]> {
  const db = createAdminClient();
  const [{ data: items }, { data: stock }] = await Promise.all([
    db
      .from("menu_items")
      .select("id, name, photo_url, diet, is_active, sort, category_id, categories(name, sort), item_portions(item_prices(city_id, price_paise))")
      .order("sort"),
    db.from("outlet_item_availability").select("item_id, status").neq("status", "available"),
  ]);
  const off = new Map<string, number>();
  for (const s of stock ?? []) off.set(s.item_id, (off.get(s.item_id) ?? 0) + 1);

  return (items ?? [])
    .map((i) => {
      const prices: Record<string, number> = {};
      for (const p of i.item_portions) for (const pr of p.item_prices) prices[pr.city_id] = Math.min(prices[pr.city_id] ?? Infinity, pr.price_paise);
      const cat = i.categories as unknown as { name: string; sort: number } | null;
      return {
        id: i.id,
        name: i.name,
        photoUrl: i.photo_url,
        diet: i.diet,
        category: cat?.name ?? "",
        categoryId: i.category_id,
        isActive: i.is_active,
        fromPrice: prices,
        unavailableAt: off.get(i.id) ?? 0,
        catSort: cat?.sort ?? 0,
        sort: i.sort,
      };
    })
    .sort((a, b) => a.catSort - b.catSort || a.sort - b.sort);
}

export async function getItemForEdit(id: string) {
  const db = createAdminClient();
  const [{ data: item }, { data: stock }] = await Promise.all([
    db
      .from("menu_items")
      .select("*, item_portions(id, name, prep_multiplier, sort, item_prices(city_id, price_paise)), addons(id, name, price_paise, diet, sort)")
      .eq("id", id)
      .maybeSingle(),
    db.from("outlet_item_availability").select("outlet_id, status").eq("item_id", id),
  ]);
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    diet: item.diet,
    spiceLevel: item.spice_level,
    allergens: item.allergens,
    basePrepMinutes: item.base_prep_minutes,
    categoryId: item.category_id,
    scheduleId: item.schedule_id,
    photoUrl: item.photo_url,
    photoCredit: item.photo_credit,
    isActive: item.is_active,
    portions: [...item.item_portions]
      .sort((a, b) => a.sort - b.sort)
      .map((p) => ({
        id: p.id,
        name: p.name,
        prepMultiplier: Number(p.prep_multiplier),
        prices: Object.fromEntries(p.item_prices.map((pr) => [pr.city_id, pr.price_paise / 100])),
      })),
    addons: [...item.addons].sort((a, b) => a.sort - b.sort).map((a) => ({ id: a.id, name: a.name, priceRupees: a.price_paise / 100, diet: a.diet })),
    availability: Object.fromEntries((stock ?? []).map((s) => [s.outlet_id, s.status])) as Record<string, "available" | "out_of_stock" | "hidden">,
  };
}

export async function listOutbox(limit = 100) {
  const db = createAdminClient();
  const { data } = await db
    .from("outbox_messages")
    .select("id, channel, to_phone, purpose, template, body, order_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  // Phone numbers are masked here, so the raw number never reaches the page.
  return (data ?? []).map(({ to_phone, ...m }) => ({ ...m, toMasked: maskPhone(to_phone) }));
}

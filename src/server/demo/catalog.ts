import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db-types";

export type CatalogLine = {
  itemId: string;
  itemSlug: string;
  portionId: string;
  name: string;
  portionName: string;
  pricePaise: number;
  basePrepMinutes: number;
  prepMultiplier: number;
};

export type DemoOutlet = {
  id: string;
  slug: string;
  cityId: string;
  lat: number;
  lng: number;
  capacitySlots: number;
  minPromiseMinutes: number;
};

/** Outlet facts plus every priced portion in its city — enough to build realistic demo orders. */
export async function loadDemoCatalog(
  client: SupabaseClient<Database>,
  outletSlugOrId: { slug?: string; id?: string },
): Promise<{ outlet: DemoOutlet; lines: CatalogLine[] }> {
  const q = client.from("outlets").select("id, slug, city_id, lat, lng, capacity_slots, min_promise_minutes");
  const { data: o, error } = await (outletSlugOrId.id ? q.eq("id", outletSlugOrId.id) : q.eq("slug", outletSlugOrId.slug ?? "")).single();
  if (error || !o) throw new Error(`outlet not found: ${outletSlugOrId.slug ?? outletSlugOrId.id}`);

  const { data: rows, error: menuError } = await client
    .from("item_portions")
    .select("id, name, prep_multiplier, menu_items!inner(id, slug, name, base_prep_minutes, is_active), item_prices!inner(price_paise, city_id)")
    .eq("item_prices.city_id", o.city_id)
    .eq("menu_items.is_active", true);
  if (menuError) throw new Error(`load menu: ${menuError.message}`);

  const lines: CatalogLine[] = (rows ?? []).flatMap((r) => {
    const price = r.item_prices[0];
    if (!price) return [];
    return [
      {
        itemId: r.menu_items.id,
        itemSlug: r.menu_items.slug,
        portionId: r.id,
        name: r.menu_items.name,
        portionName: r.name,
        pricePaise: price.price_paise,
        basePrepMinutes: r.menu_items.base_prep_minutes,
        prepMultiplier: Number(r.prep_multiplier),
      },
    ];
  });

  return {
    outlet: {
      id: o.id,
      slug: o.slug,
      cityId: o.city_id,
      lat: o.lat,
      lng: o.lng,
      capacitySlots: o.capacity_slots,
      minPromiseMinutes: o.min_promise_minutes,
    },
    lines,
  };
}

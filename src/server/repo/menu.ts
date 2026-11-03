import { createServerClient } from "../supabase/server";
import { type MenuRows, type MenuView, toMenuView } from "./menu-mapper";
import type { OutletSummary } from "./outlets";

const ITEM_COLUMNS =
  "id, category_id, name, description, photo_url, photo_credit, diet, spice_level, allergens, is_active, sort, base_prep_minutes, menu_schedules(days, starts_at, ends_at), item_portions(id, name, prep_multiplier, sort, item_prices(price_paise, city_id)), addons(id, name, price_paise, diet, sort)";

/** One outlet's menu: central items, this city's prices, this outlet's stock, and time windows. */
export async function getMenuForOutlet(outlet: OutletSummary, now: Date): Promise<MenuView> {
  const supabase = await createServerClient();
  const [categories, items, availability] = await Promise.all([
    supabase.from("categories").select("id, name, sort"),
    supabase.from("menu_items").select(ITEM_COLUMNS).eq("is_active", true).order("sort"),
    supabase.from("outlet_item_availability").select("item_id, status").eq("outlet_id", outlet.id),
  ]);
  const failed = [categories, items, availability].find((r) => r.error);
  if (failed?.error) throw new Error(`load menu: ${failed.error.message}`);

  return toMenuView(
    {
      categories: categories.data ?? [],
      items: (items.data ?? []) as unknown as MenuRows["items"],
      availability: availability.data ?? [],
    },
    outlet,
    now,
  );
}

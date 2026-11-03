import { type AvailabilityStatus, type ItemAvailability, itemAvailability } from "@/domain/availability";
import type { Schedule } from "@/domain/schedule";
import type { OutletSummary } from "./outlets";

/** Raw rows as PostgREST returns them for one outlet's menu. */
export type MenuRows = {
  categories: { id: string; name: string; sort: number }[];
  items: {
    id: string;
    category_id: string;
    name: string;
    description: string;
    photo_url: string;
    photo_credit: string;
    diet: "veg" | "non_veg" | "egg";
    spice_level: number;
    allergens: string[];
    is_active: boolean;
    sort: number;
    base_prep_minutes: number;
    menu_schedules: { days: number[]; starts_at: string; ends_at: string } | null;
    item_portions: { id: string; name: string; prep_multiplier: number; sort: number; item_prices: { price_paise: number; city_id: string }[] }[];
    addons: { id: string; name: string; price_paise: number; diet: "veg" | "non_veg" | "egg"; sort: number }[];
  }[];
  availability: { item_id: string; status: AvailabilityStatus }[];
};

export type MenuItemView = {
  id: string;
  name: string;
  description: string;
  photoUrl: string;
  photoCredit: string;
  diet: "veg" | "non_veg" | "egg";
  spiceLevel: 0 | 1 | 2 | 3;
  allergens: string[];
  categoryId: string;
  portions: { id: string; name: string; pricePaise: number; prepMultiplier: number }[];
  addons: { id: string; name: string; pricePaise: number; diet: "veg" | "non_veg" | "egg" }[];
  schedule: Schedule | null;
  availability: ItemAvailability;
  fromPricePaise: number;
};

export type MenuView = { outlet: OutletSummary; categories: { id: string; name: string; items: MenuItemView[] }[] };

const hhmm = (t: string) => t.slice(0, 5);

export function toMenuView(rows: MenuRows, outlet: OutletSummary, now: Date): MenuView {
  const stock = new Map(rows.availability.map((a) => [a.item_id, a.status]));

  const items: MenuItemView[] = rows.items.flatMap((i) => {
    const portions = [...i.item_portions]
      .sort((a, b) => a.sort - b.sort)
      .flatMap((p) => {
        const price = p.item_prices.find((x) => x.city_id === outlet.cityId);
        return price ? [{ id: p.id, name: p.name, pricePaise: price.price_paise, prepMultiplier: Number(p.prep_multiplier) }] : [];
      });
    if (portions.length === 0) return [];

    const schedule = i.menu_schedules
      ? { days: i.menu_schedules.days, startsAt: hhmm(i.menu_schedules.starts_at), endsAt: hhmm(i.menu_schedules.ends_at) }
      : null;
    const availability = itemAvailability({ status: stock.get(i.id) ?? null, schedule, isActive: i.is_active }, now);
    if (availability.state === "hidden") return [];

    return [
      {
        id: i.id,
        name: i.name,
        description: i.description,
        photoUrl: i.photo_url,
        photoCredit: i.photo_credit,
        diet: i.diet,
        spiceLevel: Math.min(3, Math.max(0, i.spice_level)) as 0 | 1 | 2 | 3,
        allergens: i.allergens,
        categoryId: i.category_id,
        portions,
        addons: [...i.addons].sort((a, b) => a.sort - b.sort).map((a) => ({ id: a.id, name: a.name, pricePaise: a.price_paise, diet: a.diet })),
        schedule,
        availability,
        fromPricePaise: Math.min(...portions.map((p) => p.pricePaise)),
      },
    ];
  });

  const categories = [...rows.categories]
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({ id: c.id, name: c.name, items: items.filter((i) => i.categoryId === c.id) }))
    .filter((c) => c.items.length > 0);

  return { outlet, categories };
}

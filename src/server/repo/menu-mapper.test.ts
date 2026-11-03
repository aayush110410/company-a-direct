import { describe, expect, it } from "vitest";
import { type MenuRows, toMenuView } from "./menu-mapper";

const outlet = {
  id: "o1",
  slug: "kondapur",
  name: "Kondapur",
  area: "Kondapur",
  kind: "outlet" as const,
  lat: 17.47,
  lng: 78.357,
  radiusKm: 5,
  isAcceptingOrders: true,
  fssaiLicence: "99000000000101",
  cityId: "c-hyd",
  citySlug: "hyderabad",
  minPromiseMinutes: 35,
  capacitySlots: 4,
};

const item = (over: Partial<MenuRows["items"][number]>): MenuRows["items"][number] => ({
  id: "i1",
  category_id: "cat-biryani",
  name: "Chicken dum biryani",
  description: "",
  photo_url: "https://images.unsplash.com/photo-1",
  photo_credit: "A",
  diet: "non_veg",
  spice_level: 2,
  allergens: ["dairy"],
  is_active: true,
  sort: 0,
  base_prep_minutes: 18,
  menu_schedules: null,
  item_portions: [
    { id: "p1", name: "Single", prep_multiplier: 1, sort: 0, item_prices: [{ price_paise: 34000, city_id: "c-hyd" }] },
    { id: "p2", name: "Family pack", prep_multiplier: 1.6, sort: 1, item_prices: [{ price_paise: 98000, city_id: "c-hyd" }] },
  ],
  addons: [],
  ...over,
});

const rows = (items: MenuRows["items"], availability: MenuRows["availability"] = []): MenuRows => ({
  categories: [
    { id: "cat-biryani", name: "Biryani", sort: 1 },
    { id: "cat-haleem", name: "Haleem", sort: 2 },
  ],
  items,
  availability,
});

const fourPmIst = new Date("2026-11-06T10:30:00Z");

describe("toMenuView", () => {
  it("groups items by category with a from-price", () => {
    const view = toMenuView(rows([item({})]), outlet, fourPmIst);
    expect(view.categories).toHaveLength(1);
    expect(view.categories[0]?.items[0]).toMatchObject({ fromPricePaise: 34000, availability: { state: "available" } });
  });

  it("drops hidden and archived items, and empty categories", () => {
    const view = toMenuView(
      rows([item({ id: "a", is_active: false }), item({ id: "b" })], [{ item_id: "b", status: "hidden" }]),
      outlet,
      fourPmIst,
    );
    expect(view.categories).toEqual([]);
  });

  it("marks haleem off-schedule at 4 pm with its opening time", () => {
    const haleem = item({
      id: "h",
      category_id: "cat-haleem",
      name: "Mutton haleem",
      menu_schedules: { days: [0, 1, 2, 3, 4, 5, 6], starts_at: "17:00:00", ends_at: "23:59:00" },
    });
    const view = toMenuView(rows([haleem]), outlet, fourPmIst);
    expect(view.categories[0]?.items[0]?.availability).toEqual({ state: "off_schedule", label: "Available from 5:00 pm" });
  });

  it("marks out-of-stock items at this outlet", () => {
    const view = toMenuView(rows([item({})], [{ item_id: "i1", status: "out_of_stock" }]), outlet, fourPmIst);
    expect(view.categories[0]?.items[0]?.availability.state).toBe("out_of_stock");
  });

  it("skips portions with no price in this city", () => {
    const noBlr = item({
      item_portions: [{ id: "p1", name: "Single", prep_multiplier: 1, sort: 0, item_prices: [{ price_paise: 37000, city_id: "c-blr" }] }],
    });
    expect(toMenuView(rows([noBlr]), outlet, fourPmIst).categories).toEqual([]);
  });
});

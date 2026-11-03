import { describe, expect, it } from "vitest";
import { type PriceBook, priceCart } from "@/domain/pricing";
import { bengaluruRupees, MENU, portionKey } from "./menu";

const hyderabadBook = (): PriceBook => {
  const book: PriceBook = { portions: {}, addons: {} };
  for (const item of MENU) {
    for (const p of item.portions) book.portions[portionKey(item.slug, p.name)] = { itemId: item.slug, pricePaise: p.hyderabad * 100 };
  }
  return book;
};
const line = (slug: string, portion: string, qty: number) => ({ itemId: slug, portionId: portionKey(slug, portion), qty, addonIds: [] });

describe("seed menu", () => {
  it("reproduces sample order WEB-778120 at ₹1,180", () => {
    const r = priceCart([line("chicken-dum-biryani", "Family pack", 1), line("double-ka-meetha", "Single", 2)], hyderabadBook());
    expect(r).toMatchObject({ ok: true, subtotalPaise: 118000 });
  });

  it("reproduces sample order WEB-778131 at ₹640", () => {
    const r = priceCart([line("veg-biryani", "Single", 2), line("mirchi-ka-salan", "Single", 1)], hyderabadBook());
    expect(r).toMatchObject({ ok: true, subtotalPaise: 64000 });
  });

  it("reproduces sample order WEB-778146 at ₹1,050", () => {
    const r = priceCart([line("mutton-haleem", "Single", 3)], hyderabadBook());
    expect(r).toMatchObject({ ok: true, subtotalPaise: 105000 });
  });

  it("prices Bengaluru about 8% higher, rounded to ₹10", () => {
    expect(bengaluruRupees(340)).toBe(370);
    expect(bengaluruRupees(980)).toBe(1060);
  });

  it("gives every item a photo, marks, allergens and prep time", () => {
    for (const item of MENU) {
      expect(item.photo.url, item.slug).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
      expect(item.photo.credit, item.slug).not.toBe("");
      expect(["veg", "non_veg", "egg"]).toContain(item.diet);
      expect(Array.isArray(item.allergens)).toBe(true);
      expect(item.basePrep).toBeGreaterThan(0);
      expect(item.portions.length).toBeGreaterThan(0);
    }
  });
});

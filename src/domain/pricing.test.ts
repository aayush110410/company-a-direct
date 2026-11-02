import { describe, expect, it } from "vitest";
import { type PriceBook, priceCart } from "./pricing";

const book: PriceBook = {
  portions: {
    "chicken-family": { itemId: "chicken", pricePaise: 98000 },
    "chicken-single": { itemId: "chicken", pricePaise: 34000 },
    "meetha-single": { itemId: "meetha", pricePaise: 10000 },
    "veg-single": { itemId: "veg", pricePaise: 28000 },
    "salan-single": { itemId: "salan", pricePaise: 8000 },
    "haleem-single": { itemId: "haleem", pricePaise: 35000 },
  },
  addons: {
    "chicken-raita": { itemId: "chicken", pricePaise: 3000 },
    "veg-raita": { itemId: "veg", pricePaise: 3000 },
  },
};

describe("priceCart", () => {
  it("prices sample order WEB-778120 at ₹1,180", () => {
    const r = priceCart(
      [
        { itemId: "chicken", portionId: "chicken-family", qty: 1, addonIds: [] },
        { itemId: "meetha", portionId: "meetha-single", qty: 2, addonIds: [] },
      ],
      book,
    );
    expect(r).toMatchObject({ ok: true, subtotalPaise: 118000 });
  });

  it("prices sample order WEB-778131 at ₹640", () => {
    const r = priceCart(
      [
        { itemId: "veg", portionId: "veg-single", qty: 2, addonIds: [] },
        { itemId: "salan", portionId: "salan-single", qty: 1, addonIds: [] },
      ],
      book,
    );
    expect(r).toMatchObject({ ok: true, subtotalPaise: 64000 });
  });

  it("prices sample order WEB-778146 at ₹1,050", () => {
    const r = priceCart([{ itemId: "haleem", portionId: "haleem-single", qty: 3, addonIds: [] }], book);
    expect(r).toMatchObject({ ok: true, subtotalPaise: 105000 });
  });

  it("adds add-on prices to the unit price", () => {
    const r = priceCart([{ itemId: "chicken", portionId: "chicken-single", qty: 2, addonIds: ["chicken-raita"] }], book);
    expect(r).toEqual({
      ok: true,
      subtotalPaise: 74000,
      lines: [
        { itemId: "chicken", portionId: "chicken-single", qty: 2, addonIds: ["chicken-raita"], unitPaise: 37000, linePaise: 74000 },
      ],
    });
  });

  it("rejects an add-on that belongs to another item", () => {
    const r = priceCart([{ itemId: "chicken", portionId: "chicken-single", qty: 1, addonIds: ["veg-raita"] }], book);
    expect(r).toEqual({ ok: false, error: "unknown_addon", index: 0 });
  });

  it("rejects a portion that belongs to another item", () => {
    const r = priceCart([{ itemId: "veg", portionId: "chicken-single", qty: 1, addonIds: [] }], book);
    expect(r).toEqual({ ok: false, error: "unknown_portion", index: 0 });
  });

  it("rejects quantities outside 1–20 and fractions", () => {
    for (const qty of [0, 21, 1.5]) {
      const r = priceCart([{ itemId: "veg", portionId: "veg-single", qty, addonIds: [] }], book);
      expect(r).toEqual({ ok: false, error: "bad_qty", index: 0 });
    }
  });

  it("rejects an empty cart", () => {
    expect(priceCart([], book)).toEqual({ ok: false, error: "empty" });
  });
});

import { describe, expect, it } from "vitest";
import { makeMenuItemSchema } from "./menu-schema";

const HYD = "8b1d3c9e-5d2f-4a8b-9c1e-2f3a4b5c6d7e";
const BLR = "1a2b3c4d-5e6f-4a8b-9c1e-2f3a4b5c6d7e";
const schema = makeMenuItemSchema([HYD, BLR]);

const valid = {
  name: "Chicken dum biryani",
  description: "Aged basmati and chicken, sealed and cooked on dum.",
  diet: "non_veg",
  spiceLevel: 2,
  allergens: ["dairy", "nuts"],
  basePrepMinutes: 18,
  categoryId: HYD,
  scheduleId: null,
  photoUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0",
  photoCredit: "Shreyak Singh",
  portions: [{ name: "Single", prepMultiplier: 1, prices: { [HYD]: 340, [BLR]: 370 } }],
  addons: [{ name: "Extra raita", priceRupees: 30, diet: "veg" }],
};

describe("menu item schema", () => {
  it("accepts a complete item", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects a spice level above 3", () => {
    expect(schema.safeParse({ ...valid, spiceLevel: 4 }).success).toBe(false);
  });

  it("rejects a zero price", () => {
    const p = { ...valid, portions: [{ ...valid.portions[0]!, prices: { [HYD]: 0, [BLR]: 370 } }] };
    expect(schema.safeParse(p).success).toBe(false);
  });

  it("rejects an allergen outside the list", () => {
    expect(schema.safeParse({ ...valid, allergens: ["gluten", "unicorn"] }).success).toBe(false);
  });

  it("requires a price in every city", () => {
    const r = schema.safeParse({ ...valid, portions: [{ ...valid.portions[0]!, prices: { [HYD]: 340 } }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/every city/);
  });

  it("needs at least one portion and at most four", () => {
    expect(schema.safeParse({ ...valid, portions: [] }).success).toBe(false);
    expect(schema.safeParse({ ...valid, portions: Array(5).fill(valid.portions[0]) }).success).toBe(false);
  });
});

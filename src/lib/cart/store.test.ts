import { describe, expect, it } from "vitest";
import { type Cart, type CartItem, cartReducer, cartTotals, lineKey } from "./store";

const kondapur = { id: "o-kondapur", slug: "kondapur", name: "Kondapur" };
const indiranagar = { id: "o-indiranagar", slug: "indiranagar", name: "Indiranagar" };
const biryani = (qty = 1, addonIds: string[] = []): Omit<CartItem, "key"> => ({
  itemId: "chicken",
  portionId: "chicken-family",
  qty,
  addonIds,
  name: "Chicken dum biryani",
  portionName: "Family pack",
  unitPaise: 98000,
  addonNames: [],
  diet: "non_veg",
});

const add = (cart: Cart | null, item = biryani(), outlet = kondapur) => cartReducer(cart, { type: "add", item, outlet });

describe("cartReducer", () => {
  it("starts a cart at the outlet of the first item", () => {
    const { cart, result } = add(null);
    expect(result).toBe("added");
    expect(cart?.outletId).toBe("o-kondapur");
    expect(cart?.lines).toHaveLength(1);
  });

  it("merges identical lines and keeps different add-ons apart", () => {
    let { cart } = add(null, biryani(1));
    ({ cart } = add(cart, biryani(2)));
    ({ cart } = add(cart, biryani(1, ["raita"])));
    expect(cart?.lines.map((l) => l.qty)).toEqual([3, 1]);
  });

  it("isolates outlets: another outlet's item asks before switching", () => {
    const { cart } = add(null);
    const next = add(cart, biryani(), indiranagar);
    expect(next.result).toBe("needs_switch");
    expect(next.cart).toEqual(cart);
  });

  it("switching outlet starts an empty cart there", () => {
    const { cart } = add(null);
    const { cart: switched } = cartReducer(cart, { type: "switchOutlet", outlet: indiranagar });
    expect(switched).toEqual({ outletId: "o-indiranagar", outletSlug: "indiranagar", outletName: "Indiranagar", lines: [] });
  });

  it("removes a line when its quantity drops to zero and caps at 20", () => {
    const { cart } = add(null);
    const key = lineKey(biryani());
    expect(cartReducer(cart, { type: "setQty", key, qty: 25 }).cart?.lines[0]?.qty).toBe(20);
    expect(cartReducer(cart, { type: "setQty", key, qty: 0 }).cart?.lines).toEqual([]);
  });

  it("totals count and subtotal", () => {
    let { cart } = add(null, biryani(1));
    ({ cart } = add(cart, { ...biryani(2), itemId: "meetha", portionId: "meetha-single", unitPaise: 10000 }));
    expect(cartTotals(cart)).toEqual({ count: 3, subtotalPaise: 118000 });
  });
});

import { describe, expect, it } from "vitest";
import { placeOrderSchema } from "./schemas";

const base = {
  outletId: "8b1d3c9e-5d2f-4a8b-9c1e-2f3a4b5c6d7e",
  deliveryLat: 17.46,
  deliveryLng: 78.36,
  lines: [{ itemId: "8b1d3c9e-5d2f-4a8b-9c1e-2f3a4b5c6d7e", portionId: "8b1d3c9e-5d2f-4a8b-9c1e-2f3a4b5c6d7e", qty: 1, addonIds: [] }],
  address: "Flat 302, Sai Residency, Kondapur",
  phone: "98765 43210",
  paymentMethod: "upi",
};

describe("placeOrderSchema", () => {
  it("normalises Indian mobile numbers", () => {
    for (const phone of ["98765 43210", "+91 98765 43210", "919876543210", "9876543210"]) {
      expect(placeOrderSchema.parse({ ...base, phone }).phone).toBe("+919876543210");
    }
  });

  it("rejects numbers that are not Indian mobiles", () => {
    for (const phone of ["12345", "5876543210", "+1 415 555 0100"]) {
      expect(placeOrderSchema.safeParse({ ...base, phone }).success).toBe(false);
    }
  });

  it("uppercases coupon codes and rejects junk", () => {
    expect(placeOrderSchema.parse({ ...base, couponCode: " direct10 " }).couponCode).toBe("DIRECT10");
    expect(placeOrderSchema.safeParse({ ...base, couponCode: "bad code!" }).success).toBe(false);
  });

  it("bounds the address and the cart", () => {
    expect(placeOrderSchema.safeParse({ ...base, address: "short" }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
  });
});

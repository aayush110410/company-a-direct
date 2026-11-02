import { describe, expect, it } from "vitest";
import { applyCoupon, type Coupon, couponMessage } from "./coupons";

const now = new Date("2026-11-06T14:00:00Z");
const direct10: Coupon = {
  code: "DIRECT10",
  kind: "percent",
  value: 10,
  minOrderPaise: 30000,
  maxDiscountPaise: 10000,
  validFrom: new Date("2026-11-01T00:00:00Z"),
  validTo: new Date("2026-12-31T00:00:00Z"),
  perCustomerLimit: 20,
  isActive: true,
};
const ctx = (subtotalPaise: number, customerUses = 0) => ({ subtotalPaise, now, customerUses });

describe("applyCoupon", () => {
  it("caps a percent discount at the maximum", () => {
    expect(applyCoupon(direct10, ctx(118000))).toEqual({ ok: true, discountPaise: 10000 });
  });
  it("applies the percent below the cap", () => {
    expect(applyCoupon(direct10, ctx(64000))).toEqual({ ok: true, discountPaise: 6400 });
  });
  it("reports the shortfall under the minimum order", () => {
    expect(applyCoupon(direct10, ctx(25000))).toEqual({ ok: false, reason: "min_order", shortfallPaise: 5000 });
  });
  it("treats a missing or inactive coupon as not found", () => {
    expect(applyCoupon(null, ctx(50000))).toEqual({ ok: false, reason: "not_found" });
    expect(applyCoupon({ ...direct10, isActive: false }, ctx(50000))).toEqual({ ok: false, reason: "not_found" });
  });
  it("rejects expired and not-yet-started coupons", () => {
    expect(applyCoupon({ ...direct10, validTo: new Date("2026-11-05T00:00:00Z") }, ctx(50000))).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(applyCoupon({ ...direct10, validFrom: new Date("2026-11-10T00:00:00Z") }, ctx(50000))).toEqual({
      ok: false,
      reason: "not_started",
    });
  });
  it("enforces the per-customer limit", () => {
    expect(applyCoupon(direct10, ctx(50000, 20))).toEqual({ ok: false, reason: "limit_reached" });
  });
  it("never discounts a flat coupon below zero", () => {
    const flat: Coupon = { ...direct10, code: "FEAST75", kind: "flat", value: 7500, minOrderPaise: 0, maxDiscountPaise: null };
    expect(applyCoupon(flat, ctx(5000))).toEqual({ ok: true, discountPaise: 5000 });
  });
});

describe("couponMessage", () => {
  it("tells the customer how much more to add", () => {
    expect(couponMessage({ ok: false, reason: "min_order", shortfallPaise: 5000 })).toBe("Add ₹50 more to use this code");
  });
  it("uses one message for unknown codes", () => {
    expect(couponMessage({ ok: false, reason: "not_found" })).toBe("That code isn't valid");
  });
});

import { formatINR } from "./money";

export type Coupon = {
  code: string;
  kind: "percent" | "flat";
  /** Percent for `percent`, paise for `flat`. */
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  validFrom: Date;
  validTo: Date;
  perCustomerLimit: number;
  isActive: boolean;
};

export type CouponFailure = {
  ok: false;
  reason: "not_found" | "not_started" | "expired" | "min_order" | "limit_reached";
  shortfallPaise?: number;
};

export type CouponResult = { ok: true; discountPaise: number } | CouponFailure;

export function applyCoupon(
  coupon: Coupon | null,
  ctx: { subtotalPaise: number; now: Date; customerUses: number },
): CouponResult {
  // Inactive and unknown codes look the same to the customer, so codes can't be probed.
  if (!coupon || !coupon.isActive) return { ok: false, reason: "not_found" };
  if (ctx.now < coupon.validFrom) return { ok: false, reason: "not_started" };
  if (ctx.now > coupon.validTo) return { ok: false, reason: "expired" };
  if (ctx.customerUses >= coupon.perCustomerLimit) return { ok: false, reason: "limit_reached" };
  if (ctx.subtotalPaise < coupon.minOrderPaise) {
    return { ok: false, reason: "min_order", shortfallPaise: coupon.minOrderPaise - ctx.subtotalPaise };
  }

  const raw =
    coupon.kind === "percent" ? Math.floor((ctx.subtotalPaise * coupon.value) / 100) : Math.min(coupon.value, ctx.subtotalPaise);
  const discountPaise = coupon.maxDiscountPaise === null ? raw : Math.min(raw, coupon.maxDiscountPaise);
  return { ok: true, discountPaise };
}

export function couponMessage(result: CouponFailure): string {
  switch (result.reason) {
    case "min_order":
      return `Add ${formatINR(result.shortfallPaise ?? 0)} more to use this code`;
    case "expired":
      return "This code has expired";
    case "not_started":
      return "This code isn't active yet";
    case "limit_reached":
      return "You've already used this code";
    case "not_found":
      return "That code isn't valid";
  }
}

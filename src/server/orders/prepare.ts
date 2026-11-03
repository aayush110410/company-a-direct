import { isOrderable, itemAvailability } from "@/domain/availability";
import { applyCoupon, couponMessage } from "@/domain/coupons";
import { haversineKm, travelMinutes } from "@/domain/geo";
import { gstIncludedPaise } from "@/domain/money";
import { computeFeatures, type PrepFeatures } from "@/domain/prep/features";
import { estimatePrep, type PrepEstimate } from "@/domain/prep/model";
import { computePromise } from "@/domain/prep/promise";
import { clockLabel, isOutletOpen } from "@/domain/schedule";
import { type PricedLine, priceCart } from "@/domain/pricing";
import { type ActionFailure, fail } from "@/lib/result";
import type { OutletSummary } from "../repo/outlets";
import type { OrderDeps, PriceBookWithMeta, QuoteInput } from "./types";

export type Prepared = {
  outlet: OutletSummary;
  book: PriceBookWithMeta;
  lines: PricedLine[];
  unavailable: { index: number; reason: string }[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  gstPaise: number;
  couponCode: string | null;
  couponError?: string;
  distanceKm: number;
  travelMinutes: number;
  features: PrepFeatures;
  estimate: PrepEstimate;
  promise: ReturnType<typeof computePromise>;
};

/**
 * The single place an order is priced and promised. Quote and place both run it; nothing the
 * browser sends about money or time is trusted.
 */
export async function prepareOrder(input: QuoteInput, customerId: string, deps: OrderDeps, now: Date): Promise<Prepared | ActionFailure> {
  const outlet = await deps.loadOutlet(input.outletId);
  if (!outlet) return fail("This kitchen isn't available. Choose your area again.");
  if (!outlet.isAcceptingOrders) return fail(`${outlet.name} isn't taking orders right now.`);
  if (deps.hoursEnforced && !isOutletOpen(outlet, now)) return fail(`${outlet.name} is closed now. It opens at ${clockLabel(outlet.opensAt)}.`);

  const distanceKm = Math.round(haversineKm({ lat: input.deliveryLat, lng: input.deliveryLng }, outlet) * 100) / 100;
  if (distanceKm > outlet.radiusKm) return fail(`${outlet.name} doesn't deliver to this address (${distanceKm.toFixed(1)} km away).`, "address");

  const book = await deps.loadPriceBook(outlet);

  // A cart can outlive the menu it was built from (a dish edited or re-priced). Flag those lines
  // so the customer can remove them, and price everything else.
  const changed = input.lines.flatMap((l, index) => (priceCart([l], book).ok ? [] : [{ index, reason: "This dish changed on the menu" }]));
  const changedIdx = new Set(changed.map((c) => c.index));
  const priceable = input.lines.filter((_, i) => !changedIdx.has(i));
  const priced: ReturnType<typeof priceCart> = priceable.length > 0 ? priceCart(priceable, book) : { ok: true, lines: [], subtotalPaise: 0 };
  if (!priced.ok) return fail("Your cart has changed. Please review it.", "lines", { error: priced.error });

  const stock = await deps.loadAvailability(outlet.id, [...new Set(input.lines.map((l) => l.itemId))]);
  const unavailable = [
    ...changed,
    ...input.lines.flatMap((l, index) => {
      if (changedIdx.has(index)) return [];
      const a = itemAvailability(stock[l.itemId] ?? { status: null, schedule: null, isActive: false }, now);
      if (isOrderable(a)) return [];
      const reason = a.state === "off_schedule" ? a.label : a.state === "out_of_stock" ? "Sold out at this kitchen" : "No longer on the menu";
      return [{ index, reason }];
    }),
  ].sort((a, b) => a.index - b.index);

  let discountPaise = 0;
  let couponError: string | undefined;
  if (input.couponCode) {
    const coupon = await deps.loadCoupon(input.couponCode);
    const uses = coupon ? await deps.countCouponUses(coupon.code, customerId) : 0;
    const r = applyCoupon(coupon, { subtotalPaise: priced.subtotalPaise, now, customerUses: uses });
    if (r.ok) discountPaise = r.discountPaise;
    else couponError = couponMessage(r);
  }

  const totalPaise = priced.subtotalPaise - discountPaise;
  const travel = travelMinutes(distanceKm);
  const features = computeFeatures({
    lines: priced.lines.map((l) => ({
      qty: l.qty,
      basePrepMinutes: book.meta[l.portionId]!.basePrepMinutes,
      prepMultiplier: book.meta[l.portionId]!.prepMultiplier,
    })),
    openOrders: await deps.loadOpenOrders(outlet.id),
    capacitySlots: outlet.capacitySlots,
    at: now,
  });
  const estimate = estimatePrep(await deps.loadActiveModel(), features, outlet.id);
  const promise = computePromise({ estimate, travelMinutes: travel, outletMinPromiseMinutes: outlet.minPromiseMinutes, at: now });

  return {
    outlet,
    book,
    lines: priced.lines,
    unavailable,
    subtotalPaise: priced.subtotalPaise,
    discountPaise,
    totalPaise,
    gstPaise: gstIncludedPaise(totalPaise),
    couponCode: couponError ? null : (input.couponCode ?? null),
    couponError,
    distanceKm,
    travelMinutes: travel,
    features,
    estimate,
    promise,
  };
}

export const isFailure = (p: Prepared | ActionFailure): p is ActionFailure => "ok" in p && p.ok === false;

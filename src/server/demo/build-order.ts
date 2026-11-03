import { gstIncludedPaise } from "@/domain/money";
import type { OrderStatus } from "@/domain/order-status";
import { computeFeatures } from "@/domain/prep/features";
import { estimatePrep, type PrepModel } from "@/domain/prep/model";
import { computePromise } from "@/domain/prep/promise";
import type { CatalogLine, DemoOutlet } from "./catalog";
import type { PaidOrderRow } from "./insert-paid-order";

const MINUTE = 60_000;

/**
 * Builds a paid demo order through the same features → estimate → promise path as checkout.
 * `promiseMinutesOverride` pins the brief's sample promises (45/40/50 min) when given.
 */
export function buildPaidOrder(input: {
  outlet: DemoOutlet;
  customerId: string;
  picks: { line: CatalogLine; qty: number }[];
  openOrders: { status: "placed" | "preparing" }[];
  model: PrepModel | null;
  placedAt: Date;
  status: OrderStatus;
  paymentMethod: "upi" | "card";
  distanceKm?: number;
  id?: string;
  promiseMinutesOverride?: number;
  stageTimes?: { preparingAt?: Date; readyAt?: Date; handedAt?: Date };
}): PaidOrderRow {
  const distanceKm = input.distanceKm ?? 2.5;
  const travelMinutes = Math.min(Math.round(4 * distanceKm + 6), 45);
  const features = computeFeatures({
    lines: input.picks.map((p) => ({ qty: p.qty, basePrepMinutes: p.line.basePrepMinutes, prepMultiplier: p.line.prepMultiplier })),
    openOrders: input.openOrders,
    capacitySlots: input.outlet.capacitySlots,
    at: input.placedAt,
  });
  const estimate = estimatePrep(input.model, features, input.outlet.id);
  const promise = computePromise({
    estimate,
    travelMinutes,
    outletMinPromiseMinutes: input.outlet.minPromiseMinutes,
    at: input.placedAt,
  });
  const promisedAt = input.promiseMinutesOverride
    ? new Date(input.placedAt.getTime() + input.promiseMinutesOverride * MINUTE)
    : promise.promisedAt;

  const subtotal = input.picks.reduce((s, p) => s + p.line.pricePaise * p.qty, 0);
  return {
    order: {
      id: input.id,
      customerId: input.customerId,
      outletId: input.outlet.id,
      status: input.status,
      subtotalPaise: subtotal,
      discountPaise: 0,
      totalPaise: subtotal,
      gstPaise: gstIncludedPaise(subtotal),
      paymentMethod: input.paymentMethod,
      distanceKm,
      travelMinutes,
      placedAt: input.placedAt,
      paidAt: input.placedAt,
      promisedAt,
      readyBy: new Date(promisedAt.getTime() - travelMinutes * MINUTE),
      ...input.stageTimes,
    },
    contact: { phone: "+919000000001", address: "Flat 302, Sai Residency, Kondapur Main Road, Hyderabad" },
    items: input.picks.map((p) => ({
      itemId: p.line.itemId,
      portionId: p.line.portionId,
      nameSnapshot: p.line.name,
      portionSnapshot: p.line.portionName,
      qty: p.qty,
      unitPricePaise: p.line.pricePaise,
      basePrepMinutes: p.line.basePrepMinutes,
      prepMultiplier: p.line.prepMultiplier,
    })),
    estimate: { features, result: estimate, outletMinMinutes: input.outlet.minPromiseMinutes, source: promise.source },
  };
}

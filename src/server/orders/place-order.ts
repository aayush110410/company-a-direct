import { type ActionResult, fail, ok } from "@/lib/result";
import { isFailure, prepareOrder } from "./prepare";
import { normalizePhone } from "./schemas";
import type { OrderDeps, PlaceOrderInput } from "./types";

/**
 * Creates the order unpaid. It reaches the kitchen only after payment succeeds; unpaid orders
 * expire after 15 minutes (assumption A13). The promise is re-computed at payment time.
 */
export async function placeOrder(input: PlaceOrderInput, customerId: string, deps: OrderDeps, now: Date): Promise<ActionResult<{ orderId: string }>> {
  const phone = normalizePhone(input.phone);
  if (!phone) return fail("Enter a 10-digit Indian mobile number", "phone");

  const p = await prepareOrder(input, customerId, deps, now);
  if (isFailure(p)) return p;
  if (p.unavailable.length > 0 || p.lines.length === 0) return fail("Some items are no longer available", "lines", { unavailable: p.unavailable });
  if (p.couponError) return fail(p.couponError, "coupon");

  const orderId = await deps.insertOrder({
    customerId,
    outletId: p.outlet.id,
    subtotalPaise: p.subtotalPaise,
    discountPaise: p.discountPaise,
    totalPaise: p.totalPaise,
    gstPaise: p.gstPaise,
    couponCode: p.couponCode,
    paymentMethod: input.paymentMethod,
    distanceKm: p.distanceKm,
    travelMinutes: p.travelMinutes,
    promisedAt: p.promise.promisedAt,
    readyBy: p.promise.readyBy,
    contact: { phone, address: input.address.trim() },
    items: p.lines.map((l) => ({
      itemId: l.itemId,
      portionId: l.portionId,
      nameSnapshot: p.book.meta[l.portionId]!.name,
      portionSnapshot: p.book.meta[l.portionId]!.portionName,
      qty: l.qty,
      unitPricePaise: l.unitPaise,
      basePrepMinutes: p.book.meta[l.portionId]!.basePrepMinutes,
      prepMultiplier: p.book.meta[l.portionId]!.prepMultiplier,
      addons: l.addonIds.map((id) => ({ id, name: p.book.addonNames[id] ?? "" })),
    })),
  });
  return ok({ orderId });
}

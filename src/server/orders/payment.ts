import type { OrderStatus } from "@/domain/order-status";
import { computeFeatures } from "@/domain/prep/features";
import { estimatePrep } from "@/domain/prep/model";
import { computePromise } from "@/domain/prep/promise";
import { formatIstTime } from "@/domain/time";
import { type ActionResult, fail, ok } from "@/lib/result";
import type { OrderDeps } from "./types";

const EXPIRED = "This order expired. Start again from the menu.";

/**
 * The mock payment gateway's callback (assumption: payments are mocked in test mode).
 * Success re-estimates against the kitchen's load *now* and confirms atomically in the database.
 */
export async function completeMockPayment(
  input: { orderId: string; outcome: "succeed" | "fail" | "timeout" },
  customerId: string,
  deps: OrderDeps,
  now: Date,
): Promise<ActionResult<{ status: OrderStatus; redirectTo: string; message?: string }>> {
  const order = await deps.getOrder(input.orderId);
  if (!order || order.customerId !== customerId) return fail("Order not found");
  if (order.status === "expired") return fail(EXPIRED);
  if (order.status !== "awaiting_payment") return ok({ status: order.status, redirectTo: `/orders/${order.id}` });

  if (input.outcome === "fail") {
    await deps.setPaymentStatus(order.id, "failed");
    return ok({ status: "awaiting_payment", redirectTo: `/pay/${order.id}`, message: "Payment failed. No money was taken. Try again or switch method." });
  }
  if (input.outcome === "timeout") {
    await deps.setPaymentStatus(order.id, "pending");
    return ok({
      status: "awaiting_payment",
      redirectTo: `/pay/${order.id}`,
      message: "We couldn't confirm the payment yet. If money left your account it will be refunded automatically; you can try again.",
    });
  }

  const outlet = await deps.loadOutlet(order.outletId);
  if (!outlet) return fail("This kitchen isn't available any more.");

  const features = computeFeatures({ lines: order.lines, openOrders: await deps.loadOpenOrders(outlet.id), capacitySlots: outlet.capacitySlots, at: now });
  const estimate = estimatePrep(await deps.loadActiveModel(), features, outlet.id);
  const promise = computePromise({ estimate, travelMinutes: order.travelMinutes, outletMinPromiseMinutes: outlet.minPromiseMinutes, at: now });

  const status = await deps.confirmPayment(
    order.id,
    promise.promisedAt,
    promise.readyBy,
    {
      model_version: estimate.modelVersion,
      features,
      predicted_minutes: estimate.predictedMinutes,
      p80_minutes: estimate.p80Minutes,
      confidence: estimate.confidence,
      outlet_min_minutes: outlet.minPromiseMinutes,
      source: promise.source,
    },
    {
      channel: "whatsapp",
      to_phone: order.phone,
      template: "order_confirmed",
      body: `Order ${order.id} confirmed. Arriving by ${formatIstTime(promise.promisedAt)}. Track it live on the Company A site.`,
    },
  );

  if (status === "expired") return fail(EXPIRED);
  return ok({ status: status ?? order.status, redirectTo: `/orders/${order.id}` });
}

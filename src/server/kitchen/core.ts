import { canTransition, nextKitchenStatus, type OrderStatus } from "@/domain/order-status";
import { applyOverride } from "@/domain/prep/promise";
import { formatIstTime } from "@/domain/time";
import { type ActionResult, fail, ok } from "@/lib/result";
import type { Session } from "../auth";
import type { OutboxMessage } from "../outbox";

/**
 * Kitchen rules, independent of Next and the database so they can be tested directly.
 * The database itself guarantees single-winner transitions; these functions decide who may ask.
 */
export type KitchenDeps = {
  getOrderMeta(
    id: string,
  ): Promise<{ outletId: string; status: OrderStatus; promisedAt: Date; travelMinutes: number; customerPhone: string } | null>;
  transition(id: string, from: OrderStatus, to: OrderStatus, actor: string, reason?: string): Promise<boolean>;
  overridePromise(id: string, promisedAt: Date, readyBy: Date, reason: string, actor: string): Promise<boolean>;
  upsertStock(outletId: string, itemId: string, status: "available" | "out_of_stock", actor: string): Promise<void>;
  ackAlert(alertId: string, outletId: string | null, actor: string): Promise<boolean>;
  enqueue(msg: OutboxMessage): Promise<void>;
};

const actorOf = (s: Session) => (s.role === "customer" ? "customer" : s.role);
const canSee = (s: Session, outletId: string) => s.role === "admin" || s.outletId === outletId;

export async function advanceOrderCore(
  input: { orderId: string; from: OrderStatus },
  session: Session,
  deps: KitchenDeps,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const meta = await deps.getOrderMeta(input.orderId);
  if (!meta) return fail("Order not found");
  if (!canSee(session, meta.outletId)) return fail("Not your outlet");

  const to = nextKitchenStatus(input.from);
  if (!to || !canTransition(input.from, to, actorOf(session))) return fail("Not allowed");

  const moved = await deps.transition(input.orderId, input.from, to, session.userId, undefined);
  return moved ? ok({ status: to }) : fail("Order already moved", "conflict");
}

export async function cancelOrderCore(
  input: { orderId: string; reason: string },
  session: Session,
  deps: KitchenDeps,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const reason = input.reason.trim();
  if (reason.length < 3) return fail("Say why the order is cancelled", "reason");

  const meta = await deps.getOrderMeta(input.orderId);
  if (!meta) return fail("Order not found");
  if (!canSee(session, meta.outletId)) return fail("Not your outlet");
  if (!canTransition(meta.status, "cancelled", actorOf(session))) return fail("This order can no longer be cancelled");

  const moved = await deps.transition(input.orderId, meta.status, "cancelled", session.userId, reason);
  if (!moved) return fail("Order already moved", "conflict");

  await deps.enqueue({
    channel: "whatsapp",
    toPhone: meta.customerPhone,
    purpose: "transactional",
    template: "order_cancelled",
    body: `We're sorry: order ${input.orderId} was cancelled by the kitchen (${reason}). Your payment will be refunded in full.`,
    orderId: input.orderId,
  });
  return ok({ status: "cancelled" });
}

export async function overridePromiseCore(
  input: { orderId: string; deltaMinutes: number; reason: string },
  session: Session,
  deps: KitchenDeps,
  now: Date,
): Promise<ActionResult<{ promisedAt: string }>> {
  if (session.role !== "outlet_manager" && session.role !== "admin") return fail("Not allowed");
  const reason = input.reason.trim();
  if (reason.length < 3) return fail("Add a short reason for the change", "reason");

  const meta = await deps.getOrderMeta(input.orderId);
  if (!meta) return fail("Order not found");
  if (!canSee(session, meta.outletId)) return fail("Not your outlet");

  const moved = applyOverride({ promisedAt: meta.promisedAt, travelMinutes: meta.travelMinutes, now, deltaMinutes: input.deltaMinutes });
  if (!moved.ok) {
    return fail(
      moved.error === "in_past" ? "That time has already passed" : "Choose a change between 30 minutes earlier and 60 minutes later",
      "deltaMinutes",
    );
  }

  const saved = await deps.overridePromise(input.orderId, moved.promisedAt, moved.readyBy, reason, session.userId);
  if (!saved) return fail("This order can no longer be changed", "conflict");

  await deps.enqueue({
    channel: "whatsapp",
    toPhone: meta.customerPhone,
    purpose: "transactional",
    template: "promise_updated",
    body: `Update on order ${input.orderId}: it will now arrive by ${formatIstTime(moved.promisedAt)}.`,
    orderId: input.orderId,
  });
  return ok({ promisedAt: moved.promisedAt.toISOString() });
}

export async function setItemStockCore(
  input: { itemId: string; status: "available" | "out_of_stock"; outletId?: string },
  session: Session,
  deps: KitchenDeps,
): Promise<ActionResult<{ status: "available" | "out_of_stock" }>> {
  const outletId = session.role === "admin" ? input.outletId : session.outletId;
  if (!outletId) return fail("Choose an outlet first");
  await deps.upsertStock(outletId, input.itemId, input.status, session.userId);
  return ok({ status: input.status });
}

export async function acknowledgeAlertCore(
  input: { alertId: string },
  session: Session,
  deps: KitchenDeps,
): Promise<ActionResult<{ alertId: string }>> {
  if (session.role !== "outlet_manager" && session.role !== "admin") return fail("Not allowed");
  const done = await deps.ackAlert(input.alertId, session.role === "admin" ? null : session.outletId, session.userId);
  return done ? ok({ alertId: input.alertId }) : fail("Alert not found");
}

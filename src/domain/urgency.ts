import type { OrderStatus } from "./order-status";
import { formatIstTime } from "./time";

export type Urgency = "on_time" | "at_risk" | "late";

const AT_RISK_MS = 5 * 60_000;
const LATE_ALERT_MS = 10 * 60_000;
const IN_KITCHEN: OrderStatus[] = ["placed", "preparing"];
const OPEN: OrderStatus[] = ["placed", "preparing", "ready", "handed_to_rider"];

/** Kitchen card colour: only orders still being cooked can be at risk or late. */
export function kitchenUrgency(o: { status: OrderStatus; readyBy: Date }, now: Date): Urgency {
  if (!IN_KITCHEN.includes(o.status)) return "on_time";
  const left = o.readyBy.getTime() - now.getTime();
  if (left < 0) return "late";
  if (left <= AT_RISK_MS) return "at_risk";
  return "on_time";
}

export function minutesLate(promisedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - promisedAt.getTime()) / 60_000));
}

/** One-line status for the customer, e.g. "Late by 4 minutes · New estimate 9:31 pm". */
export function customerStatusLabel(
  o: { status: OrderStatus; promisedAt: Date; revisedEta: Date | null },
  now: Date,
): string {
  if (o.status === "delivered") return "Delivered";
  if (o.status === "cancelled") return "Cancelled";
  if (o.status === "expired") return "Payment not completed";

  const late = minutesLate(o.promisedAt, now);
  if (late === 0) return `Arrives by ${formatIstTime(o.revisedEta ?? o.promisedAt)}`;

  const base = `Late by ${late} ${late === 1 ? "minute" : "minutes"}`;
  return o.revisedEta ? `${base} · New estimate ${formatIstTime(o.revisedEta)}` : base;
}

/** Mirrors the late rule in `run_order_jobs`: more than 10 minutes past promise, once. */
export function shouldRaiseLateAlert(
  o: { status: OrderStatus; promisedAt: Date; lateAlertedAt: Date | null },
  now: Date,
): boolean {
  return OPEN.includes(o.status) && o.lateAlertedAt === null && now.getTime() - o.promisedAt.getTime() > LATE_ALERT_MS;
}

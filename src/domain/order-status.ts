/**
 * The order lifecycle. The database enforces single-winner transitions; this module
 * decides which transitions each actor may request at all.
 */

export type OrderStatus =
  | "awaiting_payment"
  | "placed"
  | "preparing"
  | "ready"
  | "handed_to_rider"
  | "delivered"
  | "expired"
  | "cancelled";

export type Actor = "customer" | "kitchen_staff" | "outlet_manager" | "admin" | "system";

const KITCHEN_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "preparing",
  preparing: "ready",
  ready: "handed_to_rider",
};

const SYSTEM_MOVES: Record<string, OrderStatus[]> = {
  awaiting_payment: ["placed", "expired"],
  handed_to_rider: ["delivered"],
};

const CANCELLABLE: OrderStatus[] = ["placed", "preparing"];

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  switch (actor) {
    case "customer":
      return false;
    case "system":
      return SYSTEM_MOVES[from]?.includes(to) ?? false;
    case "kitchen_staff":
    case "outlet_manager":
    case "admin":
      return KITCHEN_FLOW[from] === to || (to === "cancelled" && CANCELLABLE.includes(from));
  }
}

export function nextKitchenStatus(s: OrderStatus): OrderStatus | null {
  return KITCHEN_FLOW[s] ?? null;
}

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  placed: "Start",
  preparing: "Mark ready",
  ready: "Hand to rider",
};

export function kitchenActionLabel(s: OrderStatus): string | null {
  return ACTION_LABELS[s] ?? null;
}

export const KITCHEN_COLUMNS = [
  { key: "placed", title: "New" },
  { key: "preparing", title: "Preparing" },
  { key: "ready", title: "Ready for pickup" },
  { key: "handed_to_rider", title: "With rider" },
] as const satisfies readonly { key: OrderStatus; title: string }[];

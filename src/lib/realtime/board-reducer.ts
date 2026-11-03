import type { OrderStatus } from "@/domain/order-status";

/** One ticket on the kitchen rail. */
export type BoardOrder = {
  id: string;
  status: OrderStatus;
  paidAt: string;
  readyBy: string;
  promisedAt: string;
  travelMinutes: number;
  items: { name: string; portion: string; qty: number; addons: string[] }[];
  confidence: "normal" | "low";
  source: string;
  lateAlerted: boolean;
};

export type KitchenAlert = { id: string; orderId: string; message: string; createdAt: string; acknowledgedAt: string | null };

type BoardEvent = { type: "snapshot"; orders: BoardOrder[] } | { type: "upsert"; order: BoardOrder } | { type: "remove"; id: string };

const ON_BOARD: OrderStatus[] = ["placed", "preparing", "ready", "handed_to_rider"];

export function boardReducer(state: Record<string, BoardOrder>, event: BoardEvent): Record<string, BoardOrder> {
  switch (event.type) {
    case "snapshot":
      return Object.fromEntries(event.orders.filter((o) => ON_BOARD.includes(o.status)).map((o) => [o.id, o]));
    case "upsert": {
      if (!ON_BOARD.includes(event.order.status)) return without(state, event.order.id);
      return { ...state, [event.order.id]: event.order };
    }
    case "remove":
      return without(state, event.id);
  }
}

function without(state: Record<string, BoardOrder>, id: string): Record<string, BoardOrder> {
  if (!(id in state)) return state;
  const next = { ...state };
  delete next[id];
  return next;
}

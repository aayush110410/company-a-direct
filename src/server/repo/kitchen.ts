import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardOrder, KitchenAlert } from "@/lib/realtime/board-reducer";
import type { Database } from "../db-types";

const ORDER_COLUMNS =
  "id, status, paid_at, placed_at, ready_by, promised_at, travel_minutes, late_alerted_at, order_items(name_snapshot, portion_snapshot, qty, addons), prep_estimates(confidence, source)";

type Row = {
  id: string;
  status: BoardOrder["status"];
  paid_at: string | null;
  placed_at: string;
  ready_by: string;
  promised_at: string;
  travel_minutes: number;
  late_alerted_at: string | null;
  order_items: { name_snapshot: string; portion_snapshot: string; qty: number; addons: unknown }[];
  prep_estimates: { confidence: string; source: string } | null;
};

function toBoardOrder(r: Row): BoardOrder {
  return {
    id: r.id,
    status: r.status,
    paidAt: r.paid_at ?? r.placed_at,
    readyBy: r.ready_by,
    promisedAt: r.promised_at,
    travelMinutes: r.travel_minutes,
    items: r.order_items.map((i) => ({
      name: i.name_snapshot,
      portion: i.portion_snapshot,
      qty: i.qty,
      addons: Array.isArray(i.addons) ? (i.addons as { name?: string }[]).map((a) => a.name ?? "").filter(Boolean) : [],
    })),
    confidence: r.prep_estimates?.confidence === "low" ? "low" : "normal",
    source: r.prep_estimates?.source ?? "model",
    lateAlerted: r.late_alerted_at !== null,
  };
}

/** Everything on one outlet's rail, read as the signed-in staff member (RLS scopes it to their outlet). */
export async function getBoard(client: SupabaseClient<Database>, outletId: string): Promise<{ orders: BoardOrder[]; alerts: KitchenAlert[] }> {
  const [orders, alerts] = await Promise.all([
    client
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("outlet_id", outletId)
      .in("status", ["placed", "preparing", "ready", "handed_to_rider"])
      .order("paid_at", { ascending: true }),
    client
      .from("alerts")
      .select("id, order_id, message, created_at, acknowledged_at")
      .eq("outlet_id", outletId)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false }),
  ]);
  if (orders.error) throw new Error(`load board: ${orders.error.message}`);
  return {
    orders: (orders.data as unknown as Row[]).map(toBoardOrder),
    alerts: (alerts.data ?? []).map((a) => ({
      id: a.id,
      orderId: a.order_id,
      message: a.message,
      createdAt: a.created_at,
      acknowledgedAt: a.acknowledged_at,
    })),
  };
}

export async function getBoardOrder(client: SupabaseClient<Database>, id: string): Promise<BoardOrder | null> {
  const { data } = await client.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  return data ? toBoardOrder(data as unknown as Row) : null;
}

/** The outlet's menu as a stock checklist. */
export async function getStockList(
  client: SupabaseClient<Database>,
  outletId: string,
): Promise<{ itemId: string; name: string; category: string; status: "available" | "out_of_stock" }[]> {
  const [items, stock] = await Promise.all([
    client.from("menu_items").select("id, name, sort, categories(name, sort)").eq("is_active", true),
    client.from("outlet_item_availability").select("item_id, status").eq("outlet_id", outletId),
  ]);
  const status = new Map((stock.data ?? []).map((s) => [s.item_id, s.status]));
  return ((items.data ?? []) as unknown as { id: string; name: string; sort: number; categories: { name: string; sort: number } | null }[])
    .sort((a, b) => (a.categories?.sort ?? 0) - (b.categories?.sort ?? 0) || a.sort - b.sort)
    .filter((i) => status.get(i.id) !== "hidden")
    .map((i) => ({
      itemId: i.id,
      name: i.name,
      category: i.categories?.name ?? "",
      status: status.get(i.id) === "out_of_stock" ? "out_of_stock" : "available",
    }));
}

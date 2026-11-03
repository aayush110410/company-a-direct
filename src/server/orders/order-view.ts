import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "@/domain/order-status";
import type { Database } from "../db-types";

/** What the customer sees about their own order, read through RLS. */
export type OrderView = {
  id: string;
  status: OrderStatus;
  outletName: string;
  outletFssai: string;
  placedAt: string;
  paidAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  handedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  promisedAt: string;
  revisedEta: string | null;
  totalPaise: number;
  discountPaise: number;
  gstPaise: number;
  paymentMethod: "upi" | "card";
  paymentStatus: string;
  confidence: "normal" | "low";
  items: { name: string; portion: string; qty: number; unitPaise: number; addons: string[] }[];
  /** Orders on the same rail paid before this one and not yet ready. Filled server-side. */
  ticketsAhead: number | null;
};

export async function getOrderView(client: SupabaseClient<Database>, id: string): Promise<OrderView | null> {
  const { data } = await client
    .from("orders")
    .select(
      "id, status, placed_at, paid_at, preparing_at, ready_at, handed_at, delivered_at, cancelled_at, cancel_reason, promised_at, revised_eta, total_paise, discount_paise, gst_paise, payment_method, payment_status, outlets(name, fssai_licence), order_items(name_snapshot, portion_snapshot, qty, unit_price_paise, addons), prep_estimates(confidence)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const outlet = data.outlets as unknown as { name: string; fssai_licence: string };
  const est = data.prep_estimates as unknown as { confidence: string } | null;
  return {
    id: data.id,
    status: data.status,
    outletName: outlet.name,
    outletFssai: outlet.fssai_licence,
    placedAt: data.placed_at,
    paidAt: data.paid_at,
    preparingAt: data.preparing_at,
    readyAt: data.ready_at,
    handedAt: data.handed_at,
    deliveredAt: data.delivered_at,
    cancelledAt: data.cancelled_at,
    cancelReason: data.cancel_reason,
    promisedAt: data.promised_at,
    revisedEta: data.revised_eta,
    totalPaise: data.total_paise,
    discountPaise: data.discount_paise,
    gstPaise: data.gst_paise,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    confidence: est?.confidence === "low" ? "low" : "normal",
    items: data.order_items.map((i) => ({
      name: i.name_snapshot,
      portion: i.portion_snapshot,
      qty: i.qty,
      unitPaise: i.unit_price_paise,
      addons: Array.isArray(i.addons) ? (i.addons as { name?: string }[]).map((a) => a.name ?? "").filter(Boolean) : [],
    })),
    ticketsAhead: null,
  };
}

/** Count only — no other customer's details leave the server. */
export async function countTicketsAhead(admin: SupabaseClient<Database>, orderId: string): Promise<number | null> {
  const { data: o } = await admin.from("orders").select("outlet_id, paid_at, status").eq("id", orderId).maybeSingle();
  if (!o?.paid_at || !["placed", "preparing"].includes(o.status)) return null;
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("outlet_id", o.outlet_id)
    .in("status", ["placed", "preparing"])
    .lt("paid_at", o.paid_at);
  return count ?? 0;
}

const IN_PROGRESS = ["placed", "preparing", "ready", "handed_to_rider"] as const;

/** The customer's latest paid order still on its way, for the header's way back to it. */
export async function latestOpenOrderId(client: SupabaseClient<Database>, customerId: string): Promise<string | null> {
  const { data } = await client
    .from("orders")
    .select("id")
    .eq("customer_id", customerId)
    .in("status", [...IN_PROGRESS])
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

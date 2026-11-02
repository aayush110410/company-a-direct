import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "@/domain/order-status";
import type { PrepEstimate } from "@/domain/prep/model";
import type { PrepFeatures } from "@/domain/prep/features";
import type { Database } from "../db-types";

/** Everything needed to write an already-paid order in one go (seed, demo reset, rush simulator). */
export type PaidOrderRow = {
  order: {
    id?: string;
    customerId: string;
    outletId: string;
    status: OrderStatus;
    subtotalPaise: number;
    discountPaise: number;
    totalPaise: number;
    gstPaise: number;
    paymentMethod: "upi" | "card";
    distanceKm: number;
    travelMinutes: number;
    placedAt: Date;
    paidAt: Date;
    promisedAt: Date;
    readyBy: Date;
    preparingAt?: Date;
    readyAt?: Date;
    handedAt?: Date;
  };
  contact: { phone: string; address: string };
  items: {
    itemId: string;
    portionId: string;
    nameSnapshot: string;
    portionSnapshot: string;
    qty: number;
    unitPricePaise: number;
    basePrepMinutes: number;
    prepMultiplier: number;
  }[];
  estimate: {
    features: PrepFeatures;
    result: PrepEstimate;
    outletMinMinutes: number;
    source: "model" | "outlet_minimum" | "fallback";
  };
};

const iso = (d?: Date) => (d ? d.toISOString() : null);

export async function insertPaidOrder(client: SupabaseClient<Database>, row: PaidOrderRow): Promise<string> {
  const o = row.order;
  const { data, error } = await client
    .from("orders")
    .insert({
      ...(o.id ? { id: o.id } : {}),
      customer_id: o.customerId,
      outlet_id: o.outletId,
      status: o.status,
      subtotal_paise: o.subtotalPaise,
      discount_paise: o.discountPaise,
      total_paise: o.totalPaise,
      gst_paise: o.gstPaise,
      payment_method: o.paymentMethod,
      payment_status: "succeeded",
      distance_km: o.distanceKm,
      travel_minutes: o.travelMinutes,
      placed_at: o.placedAt.toISOString(),
      paid_at: o.paidAt.toISOString(),
      promised_at: o.promisedAt.toISOString(),
      ready_by: o.readyBy.toISOString(),
      preparing_at: iso(o.preparingAt),
      ready_at: iso(o.readyAt),
      handed_at: iso(o.handedAt),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`insert order: ${error?.message}`);
  const id = data.id;

  const writes = await Promise.all([
    client.from("order_contacts").insert({ order_id: id, customer_phone: row.contact.phone, delivery_address: row.contact.address }),
    client.from("order_items").insert(
      row.items.map((i) => ({
        order_id: id,
        item_id: i.itemId,
        portion_id: i.portionId,
        name_snapshot: i.nameSnapshot,
        portion_snapshot: i.portionSnapshot,
        qty: i.qty,
        unit_price_paise: i.unitPricePaise,
        base_prep_minutes: i.basePrepMinutes,
        prep_multiplier: i.prepMultiplier,
      })),
    ),
    client.from("payments").insert({ order_id: id, method: o.paymentMethod, status: "succeeded", amount_paise: o.totalPaise }),
    client.from("prep_estimates").insert({
      order_id: id,
      model_version: row.estimate.result.modelVersion,
      features: row.estimate.features,
      predicted_minutes: row.estimate.result.predictedMinutes,
      p80_minutes: row.estimate.result.p80Minutes,
      confidence: row.estimate.result.confidence,
      outlet_min_minutes: row.estimate.outletMinMinutes,
      source: row.estimate.source,
      promised_at: o.promisedAt.toISOString(),
    }),
    client.from("order_events").insert(eventsFor(id, o)),
  ]);
  const failed = writes.find((w) => w.error);
  if (failed?.error) throw new Error(`insert order details: ${failed.error.message}`);
  return id;
}

function eventsFor(id: string, o: PaidOrderRow["order"]) {
  const events = [{ order_id: id, from_status: "awaiting_payment" as const, to_status: "placed" as const, at: o.paidAt.toISOString() }];
  if (o.preparingAt) events.push({ order_id: id, from_status: "placed" as never, to_status: "preparing" as never, at: o.preparingAt.toISOString() });
  if (o.readyAt) events.push({ order_id: id, from_status: "preparing" as never, to_status: "ready" as never, at: o.readyAt.toISOString() });
  if (o.handedAt) events.push({ order_id: id, from_status: "ready" as never, to_status: "handed_to_rider" as never, at: o.handedAt.toISOString() });
  return events;
}

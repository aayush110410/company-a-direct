import "server-only";
import { enqueueMessage } from "../outbox";
import { createAdminClient } from "../supabase/admin";
import type { KitchenDeps } from "./core";

/** Real kitchen dependencies: service-role writes, called only after the action checked the caller. */
export function kitchenDeps(): KitchenDeps {
  const db = createAdminClient();
  return {
    async getOrderMeta(id) {
      const { data } = await db
        .from("orders")
        .select("outlet_id, status, promised_at, travel_minutes, order_contacts(customer_phone)")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        outletId: data.outlet_id,
        status: data.status,
        promisedAt: new Date(data.promised_at),
        travelMinutes: data.travel_minutes,
        customerPhone: (data.order_contacts as unknown as { customer_phone: string } | null)?.customer_phone ?? "",
      };
    },
    async transition(id, from, to, actor, reason) {
      const { data, error } = await db.rpc("transition_order", {
        p_order_id: id,
        p_from: from,
        p_to: to,
        p_actor: actor,
        ...(reason ? { p_reason: reason } : {}),
      });
      if (error) throw new Error(`transition: ${error.message}`);
      return data === true;
    },
    async overridePromise(id, promisedAt, readyBy, reason, actor) {
      const { data, error } = await db.rpc("override_promise", {
        p_order_id: id,
        p_promised_at: promisedAt.toISOString(),
        p_ready_by: readyBy.toISOString(),
        p_reason: reason,
        p_actor: actor,
      });
      if (error) throw new Error(`override: ${error.message}`);
      return data === true;
    },
    async upsertStock(outletId, itemId, status, actor) {
      const row = { status, updated_by: actor, updated_at: new Date().toISOString() };
      // The status guard is in the same statement, so a hide can't be overwritten in between.
      const { data, error } = await db
        .from("outlet_item_availability")
        .update(row)
        .eq("outlet_id", outletId)
        .eq("item_id", itemId)
        .neq("status", "hidden")
        .select("item_id");
      if (error) throw new Error(`stock: ${error.message}`);
      if ((data?.length ?? 0) > 0) return "saved";

      const { data: existing } = await db
        .from("outlet_item_availability")
        .select("status")
        .eq("outlet_id", outletId)
        .eq("item_id", itemId)
        .maybeSingle();
      if (existing?.status === "hidden") return "hidden";

      const { error: insertError } = await db
        .from("outlet_item_availability")
        .upsert({ outlet_id: outletId, item_id: itemId, ...row }, { onConflict: "outlet_id,item_id", ignoreDuplicates: true });
      if (insertError) throw new Error(`stock: ${insertError.message}`);
      return "saved";
    },
    async ackAlert(alertId, outletId, actor) {
      let q = db.from("alerts").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: actor }).eq("id", alertId);
      if (outletId) q = q.eq("outlet_id", outletId);
      const { data } = await q.select("id");
      return (data?.length ?? 0) > 0;
    },
    async enqueue(msg) {
      await enqueueMessage(db, msg);
    },
  };
}

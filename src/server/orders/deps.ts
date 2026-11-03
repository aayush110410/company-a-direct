import "server-only";
import type { Coupon } from "@/domain/coupons";
import { serverEnv } from "../env";
import { loadActiveModel } from "../model-store";
import { toOutletSummary } from "../repo/outlets";
import { createAdminClient } from "../supabase/admin";
import type { OrderDeps } from "./types";

/** Real order dependencies over the service-role client. Only called after the action checked the caller. */
export function orderDeps(): OrderDeps {
  const db = createAdminClient();
  return {
    // Demo deployments take orders round the clock so reviewers in any time zone can try them.
    hoursEnforced: !serverEnv().DEMO_MODE,
    appUrl: serverEnv().APP_URL,
    async loadOutlet(id) {
      const { data } = await db
        .from("outlets")
        .select("id, slug, name, area, kind, lat, lng, delivery_radius_km, is_accepting_orders, fssai_licence, city_id, min_promise_minutes, capacity_slots, opens_at, closes_at, cities(slug)")
        .eq("id", id)
        .maybeSingle();
      return data ? toOutletSummary(data as never) : null;
    },

    async loadPriceBook(outlet) {
      const { data, error } = await db
        .from("item_portions")
        .select("id, name, prep_multiplier, menu_items!inner(id, name, base_prep_minutes, addons(id, name, price_paise)), item_prices!inner(price_paise, city_id)")
        .eq("item_prices.city_id", outlet.cityId);
      if (error) throw new Error(`price book: ${error.message}`);
      const book: Awaited<ReturnType<OrderDeps["loadPriceBook"]>> = { portions: {}, addons: {}, meta: {}, addonNames: {} };
      for (const p of data ?? []) {
        const price = p.item_prices[0];
        if (!price) continue;
        book.portions[p.id] = { itemId: p.menu_items.id, pricePaise: price.price_paise };
        book.meta[p.id] = {
          name: p.menu_items.name,
          portionName: p.name,
          basePrepMinutes: p.menu_items.base_prep_minutes,
          prepMultiplier: Number(p.prep_multiplier),
        };
        for (const a of p.menu_items.addons) {
          book.addons[a.id] = { itemId: p.menu_items.id, pricePaise: a.price_paise };
          book.addonNames[a.id] = a.name;
        }
      }
      return book;
    },

    async loadAvailability(outletId, itemIds) {
      const [items, stock] = await Promise.all([
        db.from("menu_items").select("id, is_active, menu_schedules(days, starts_at, ends_at)").in("id", itemIds),
        db.from("outlet_item_availability").select("item_id, status").eq("outlet_id", outletId).in("item_id", itemIds),
      ]);
      const status = new Map((stock.data ?? []).map((s) => [s.item_id, s.status]));
      return Object.fromEntries(
        (items.data ?? []).map((i) => {
          const s = i.menu_schedules as { days: number[]; starts_at: string; ends_at: string } | null;
          return [
            i.id,
            {
              status: status.get(i.id) ?? null,
              schedule: s ? { days: s.days, startsAt: s.starts_at.slice(0, 5), endsAt: s.ends_at.slice(0, 5) } : null,
              isActive: i.is_active,
            },
          ];
        }),
      );
    },

    async loadCoupon(code) {
      const { data } = await db.from("coupons").select("*").eq("code", code).maybeSingle();
      if (!data) return null;
      const c: Coupon = {
        code: data.code,
        kind: data.kind,
        value: data.value,
        minOrderPaise: data.min_order_paise,
        maxDiscountPaise: data.max_discount_paise,
        validFrom: new Date(data.valid_from),
        validTo: new Date(data.valid_to),
        perCustomerLimit: data.per_customer_limit,
        isActive: data.is_active,
      };
      return c;
    },

    async countCouponUses(code, customerId) {
      const { count } = await db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("coupon_code", code)
        .eq("customer_id", customerId)
        .not("status", "in", "(expired,cancelled)");
      return count ?? 0;
    },

    async loadOpenOrders(outletId) {
      const { data } = await db.from("orders").select("status").eq("outlet_id", outletId).in("status", ["placed", "preparing"]);
      return (data ?? []) as { status: "placed" | "preparing" }[];
    },

    loadActiveModel: () => loadActiveModel(db),

    async insertOrder(row) {
      const { data, error } = await db
        .from("orders")
        .insert({
          customer_id: row.customerId,
          outlet_id: row.outletId,
          status: "awaiting_payment",
          subtotal_paise: row.subtotalPaise,
          discount_paise: row.discountPaise,
          total_paise: row.totalPaise,
          gst_paise: row.gstPaise,
          coupon_code: row.couponCode,
          payment_method: row.paymentMethod,
          payment_status: "pending",
          distance_km: row.distanceKm,
          travel_minutes: row.travelMinutes,
          promised_at: row.promisedAt.toISOString(),
          ready_by: row.readyBy.toISOString(),
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`insert order: ${error?.message}`);
      const writes = await Promise.all([
        db.from("order_contacts").insert({ order_id: data.id, customer_phone: row.contact.phone, delivery_address: row.contact.address }),
        db.from("order_items").insert(
          row.items.map((i) => ({
            order_id: data.id,
            item_id: i.itemId,
            portion_id: i.portionId,
            name_snapshot: i.nameSnapshot,
            portion_snapshot: i.portionSnapshot,
            qty: i.qty,
            unit_price_paise: i.unitPricePaise,
            base_prep_minutes: i.basePrepMinutes,
            prep_multiplier: i.prepMultiplier,
            addons: i.addons,
          })),
        ),
        db.from("payments").insert({ order_id: data.id, method: row.paymentMethod, status: "pending", amount_paise: row.totalPaise }),
      ]);
      const failed = writes.find((w) => w.error);
      if (failed?.error) {
        // Never leave a half-written order behind.
        await db.from("orders").delete().eq("id", data.id);
        throw new Error(`insert order details: ${failed.error.message}`);
      }
      return data.id;
    },

    async getOrder(id) {
      const { data } = await db
        .from("orders")
        .select("id, customer_id, outlet_id, status, travel_minutes, total_paise, order_contacts(customer_phone), order_items(qty, base_prep_minutes, prep_multiplier)")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        customerId: data.customer_id,
        outletId: data.outlet_id,
        status: data.status,
        travelMinutes: data.travel_minutes,
        totalPaise: data.total_paise,
        phone: (data.order_contacts as unknown as { customer_phone: string } | null)?.customer_phone ?? "",
        lines: data.order_items.map((i) => ({ qty: i.qty, basePrepMinutes: i.base_prep_minutes, prepMultiplier: Number(i.prep_multiplier) })),
      };
    },

    async confirmPayment(id, promisedAt, readyBy, estimate, message) {
      const { data, error } = await db.rpc("confirm_payment", {
        p_order_id: id,
        p_promised_at: promisedAt.toISOString(),
        p_ready_by: readyBy.toISOString(),
        p_estimate: estimate,
        p_message: message,
      });
      if (error) throw new Error(`confirm payment: ${error.message}`);
      return data;
    },

    async setPaymentStatus(orderId, status) {
      await Promise.all([
        db.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("order_id", orderId).eq("status", "pending"),
        db.from("orders").update({ payment_status: status }).eq("id", orderId).eq("status", "awaiting_payment"),
      ]);
    },
  };
}

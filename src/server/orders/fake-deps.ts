import type { Coupon } from "@/domain/coupons";
import type { OrderStatus } from "@/domain/order-status";
import type { OutletSummary } from "../repo/outlets";
import type { NewOrderRow, OrderDeps } from "./types";

/** In-memory dependencies for testing the order rules without a database. */
export function fakeOrderDeps(over: { outlet?: Partial<OutletSummary>; coupon?: Coupon | null; couponUses?: number; hoursEnforced?: boolean } = {}) {
  const outlet: OutletSummary = {
    id: "o-kondapur",
    slug: "kondapur",
    name: "Kondapur",
    area: "Kondapur",
    kind: "outlet",
    lat: 17.47,
    lng: 78.357,
    radiusKm: 5,
    isAcceptingOrders: true,
    fssaiLicence: "99000000000101",
    cityId: "c-hyd",
    citySlug: "hyderabad",
    minPromiseMinutes: 35,
    capacitySlots: 4,
    opensAt: "00:00:00",
    closesAt: "23:59:00",
    ...over.outlet,
  };
  const orders = new Map<string, NewOrderRow & { id: string; status: OrderStatus; paymentStatus: string; promised?: Date }>();
  const availability: Record<string, { status: "available" | "out_of_stock" | "hidden" | null; schedule: { days: number[]; startsAt: string; endsAt: string } | null; isActive: boolean }> = {};
  const calls = { confirmPayment: 0, messages: [] as string[] };

  const deps: OrderDeps = {
    hoursEnforced: over.hoursEnforced ?? true,
    loadOutlet: async (id) => (id === outlet.id ? outlet : null),
    loadPriceBook: async () => ({
      portions: {
        "p-chicken-family": { itemId: "chicken", pricePaise: 98000 },
        "p-meetha": { itemId: "meetha", pricePaise: 10000 },
        "p-haleem": { itemId: "haleem", pricePaise: 35000 },
      },
      addons: { "a-raita": { itemId: "chicken", pricePaise: 3000 } },
      meta: {
        "p-chicken-family": { name: "Chicken dum biryani", portionName: "Family pack", basePrepMinutes: 18, prepMultiplier: 1.6 },
        "p-meetha": { name: "Double ka meetha", portionName: "Single", basePrepMinutes: 4, prepMultiplier: 1 },
        "p-haleem": { name: "Mutton haleem", portionName: "Single", basePrepMinutes: 6, prepMultiplier: 1 },
      },
      addonNames: { "a-raita": "Extra dahi chutney" },
    }),
    loadAvailability: async (_outletId, itemIds) =>
      Object.fromEntries(itemIds.map((id) => [id, availability[id] ?? { status: null, schedule: null, isActive: true }])),
    loadCoupon: async (code) => (over.coupon && over.coupon.code === code ? over.coupon : null),
    countCouponUses: async () => over.couponUses ?? 0,
    loadOpenOrders: async () => [],
    loadActiveModel: async () => null,
    insertOrder: async (row) => {
      const id = `WEB-${778200 + orders.size}`;
      orders.set(id, { ...row, id, status: "awaiting_payment", paymentStatus: "pending" });
      return id;
    },
    getOrder: async (id) => {
      const o = orders.get(id);
      if (!o) return null;
      return {
        id,
        customerId: o.customerId,
        outletId: o.outletId,
        status: o.status,
        travelMinutes: o.travelMinutes,
        totalPaise: o.totalPaise,
        phone: o.contact.phone,
        lines: o.items.map((i) => ({ qty: i.qty, basePrepMinutes: i.basePrepMinutes, prepMultiplier: i.prepMultiplier })),
      };
    },
    confirmPayment: async (id, promisedAt, _readyBy, _estimate, message) => {
      calls.confirmPayment++;
      const o = orders.get(id)!;
      if (o.status !== "awaiting_payment") return o.status;
      o.status = "placed";
      o.paymentStatus = "succeeded";
      o.promised = promisedAt;
      calls.messages.push(message.body);
      return "placed";
    },
    setPaymentStatus: async (id, status) => {
      orders.get(id)!.paymentStatus = status;
    },
  };
  return { deps, outlet, orders, availability, calls };
}

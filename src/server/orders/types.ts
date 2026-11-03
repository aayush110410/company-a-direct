import type { AvailabilityStatus } from "@/domain/availability";
import type { Coupon } from "@/domain/coupons";
import type { OrderStatus } from "@/domain/order-status";
import type { PrepFeatures, PrepLine } from "@/domain/prep/features";
import type { PrepModel } from "@/domain/prep/model";
import type { CartLine, PriceBook } from "@/domain/pricing";
import type { Schedule } from "@/domain/schedule";
import type { OutletSummary } from "../repo/outlets";

export type QuoteInput = {
  outletId: string;
  lines: CartLine[];
  couponCode?: string;
  deliveryLat: number;
  deliveryLng: number;
};

export type PlaceOrderInput = QuoteInput & { address: string; phone: string; paymentMethod: "upi" | "card" };

export type PriceBookWithMeta = PriceBook & {
  meta: Record<string, { name: string; portionName: string; basePrepMinutes: number; prepMultiplier: number }>;
  addonNames: Record<string, string>;
};

export type NewOrderRow = {
  customerId: string;
  outletId: string;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  gstPaise: number;
  couponCode: string | null;
  paymentMethod: "upi" | "card";
  distanceKm: number;
  travelMinutes: number;
  promisedAt: Date;
  readyBy: Date;
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
    addons: { id: string; name: string }[];
  }[];
};

export type EstimateRow = {
  model_version: string | null;
  features: PrepFeatures;
  predicted_minutes: number;
  p80_minutes: number;
  confidence: "normal" | "low";
  outlet_min_minutes: number;
  source: "model" | "outlet_minimum" | "fallback";
};

export type MessageRow = { channel: "whatsapp"; to_phone: string; template: string; body: string };

/** Everything the order rules need from the outside world. Real: deps.ts. Tests: fake-deps.ts. */
export type OrderDeps = {
  /** False only in demo mode: outlet opening hours are then not checked. */
  hoursEnforced: boolean;
  /** Public site address, for links in customer messages. */
  appUrl: string;
  loadOutlet(id: string): Promise<OutletSummary | null>;
  loadPriceBook(outlet: OutletSummary): Promise<PriceBookWithMeta>;
  loadAvailability(
    outletId: string,
    itemIds: string[],
  ): Promise<Record<string, { status: AvailabilityStatus | null; schedule: Schedule | null; isActive: boolean }>>;
  loadCoupon(code: string): Promise<Coupon | null>;
  countCouponUses(code: string, customerId: string): Promise<number>;
  loadOpenOrders(outletId: string): Promise<{ status: "placed" | "preparing" }[]>;
  loadActiveModel(): Promise<PrepModel | null>;
  insertOrder(row: NewOrderRow): Promise<string>;
  getOrder(id: string): Promise<{
    id: string;
    customerId: string;
    outletId: string;
    status: OrderStatus;
    travelMinutes: number;
    totalPaise: number;
    phone: string;
    lines: PrepLine[];
  } | null>;
  confirmPayment(id: string, promisedAt: Date, readyBy: Date, estimate: EstimateRow, message: MessageRow): Promise<OrderStatus | null>;
  setPaymentStatus(orderId: string, status: "failed" | "pending"): Promise<void>;
};

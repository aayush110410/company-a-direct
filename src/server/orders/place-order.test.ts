import { describe, expect, it } from "vitest";
import type { Coupon } from "@/domain/coupons";
import { fakeOrderDeps } from "./fake-deps";
import { placeOrder } from "./place-order";
import { quoteOrder } from "./quote";

const now = new Date("2026-11-06T15:30:00Z"); // 21:00 IST Friday
const near = { deliveryLat: 17.4655, deliveryLng: 78.3615 };
const sample = {
  outletId: "o-kondapur",
  ...near,
  lines: [
    { itemId: "chicken", portionId: "p-chicken-family", qty: 1, addonIds: [] },
    { itemId: "meetha", portionId: "p-meetha", qty: 2, addonIds: [] },
  ],
};
const contact = { address: "Flat 302, Sai Residency, Kondapur", phone: "9876543210", paymentMethod: "upi" as const };
const direct10: Coupon = {
  code: "DIRECT10",
  kind: "percent",
  value: 10,
  minOrderPaise: 30000,
  maxDiscountPaise: 10000,
  validFrom: new Date("2026-11-01T00:00:00Z"),
  validTo: new Date("2026-12-31T00:00:00Z"),
  perCustomerLimit: 20,
  isActive: true,
};

describe("quoteOrder", () => {
  it("prices the sample order at ₹1,180 with GST shown and a promise no sooner than the outlet minimum", async () => {
    const { deps } = fakeOrderDeps();
    const r = await quoteOrder(sample, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: true, data: { subtotalPaise: 118000, discountPaise: 0, totalPaise: 118000, gstPaise: 5619 } });
    if (r.ok) expect(r.data.promiseMinutes).toBeGreaterThanOrEqual(35);
  });

  it("applies a valid coupon", async () => {
    const { deps } = fakeOrderDeps({ coupon: direct10 });
    const r = await quoteOrder({ ...sample, couponCode: "DIRECT10" }, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: true, data: { discountPaise: 10000, totalPaise: 108000 } });
  });

  it("flags lines whose portion no longer exists instead of failing the whole quote", async () => {
    const { deps } = fakeOrderDeps();
    const stale = { ...sample, lines: [{ itemId: "chicken", portionId: "p-deleted", qty: 1, addonIds: [] }, sample.lines[1]!] };
    const r = await quoteOrder(stale, "cust-1", deps, now);
    expect(r).toMatchObject({
      ok: true,
      data: { subtotalPaise: 20000, unavailable: [{ index: 0, reason: "This dish changed on the menu" }] },
    });
  });

  it("reports a bad coupon without failing the quote", async () => {
    const { deps } = fakeOrderDeps();
    const r = await quoteOrder({ ...sample, couponCode: "NOPE" }, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: true, data: { discountPaise: 0, couponError: "That code isn't valid" } });
  });
});

describe("placeOrder", () => {
  it("creates an unpaid order priced by the server", async () => {
    const { deps, orders } = fakeOrderDeps();
    const r = await placeOrder({ ...sample, ...contact }, "cust-1", deps, now);
    expect(r.ok).toBe(true);
    const row = [...orders.values()][0]!;
    expect(row).toMatchObject({ totalPaise: 118000, status: "awaiting_payment", contact: { phone: "+919876543210" } });
  });

  it("ignores any price the client might send", async () => {
    const { deps, orders } = fakeOrderDeps();
    const tampered = { ...sample, ...contact, totalPaise: 100, lines: sample.lines.map((l) => ({ ...l, unitPaise: 1 })) };
    await placeOrder(tampered as never, "cust-1", deps, now);
    expect([...orders.values()][0]!.totalPaise).toBe(118000);
  });

  it("rejects lines that are no longer available and says which", async () => {
    const { deps, availability } = fakeOrderDeps();
    availability.meetha = { status: "out_of_stock", schedule: null, isActive: true };
    const r = await placeOrder({ ...sample, ...contact }, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: false, field: "lines", details: { unavailable: [{ index: 1, reason: "Sold out at this kitchen" }] } });
  });

  it("rejects lines outside their time window", async () => {
    const { deps, availability } = fakeOrderDeps();
    availability.haleem = { status: null, schedule: { days: [0, 1, 2, 3, 4, 5, 6], startsAt: "17:00", endsAt: "23:59" }, isActive: true };
    const fourPm = new Date("2026-11-06T10:30:00Z");
    const r = await placeOrder(
      { ...contact, outletId: "o-kondapur", ...near, lines: [{ itemId: "haleem", portionId: "p-haleem", qty: 1, addonIds: [] }] },
      "cust-1",
      deps,
      fourPm,
    );
    expect(r).toMatchObject({ ok: false, field: "lines", details: { unavailable: [{ index: 0, reason: "Available from 5:00 pm" }] } });
  });

  it("refuses an address outside the delivery radius", async () => {
    const { deps } = fakeOrderDeps();
    const r = await placeOrder({ ...sample, ...contact, deliveryLat: 17.2403, deliveryLng: 78.4294 }, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: false, field: "address" });
  });

  it("refuses an invalid coupon instead of silently dropping it", async () => {
    const { deps } = fakeOrderDeps();
    const r = await placeOrder({ ...sample, ...contact, couponCode: "NOPE" }, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: false, field: "coupon" });
  });

  it("refuses a kitchen that has stopped taking orders", async () => {
    const { deps } = fakeOrderDeps({ outlet: { isAcceptingOrders: false } });
    const r = await placeOrder({ ...sample, ...contact }, "cust-1", deps, now);
    expect(r.ok).toBe(false);
  });

  it("refuses an order before the kitchen opens and says when it does", async () => {
    const early = new Date("2026-11-06T02:30:00Z"); // 08:00 IST
    const { deps } = fakeOrderDeps({ outlet: { opensAt: "11:00:00", closesAt: "23:59:00" } });
    const r = await quoteOrder(sample, "cust-1", deps, early);
    expect(r).toMatchObject({ ok: false, error: "Kondapur is closed now. It opens at 11:00 am." });
  });

  it("takes orders at any hour when hours are not enforced (demo)", async () => {
    const early = new Date("2026-11-06T02:30:00Z");
    const { deps } = fakeOrderDeps({ outlet: { opensAt: "11:00:00", closesAt: "23:59:00" }, hoursEnforced: false });
    const r = await quoteOrder(sample, "cust-1", deps, early);
    expect(r.ok).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { fakeOrderDeps } from "./fake-deps";
import { completeMockPayment } from "./payment";
import { placeOrder } from "./place-order";

const now = new Date("2026-11-06T15:30:00Z");
const input = {
  outletId: "o-kondapur",
  deliveryLat: 17.4655,
  deliveryLng: 78.3615,
  lines: [{ itemId: "chicken", portionId: "p-chicken-family", qty: 1, addonIds: [] }],
  address: "Flat 302, Sai Residency, Kondapur",
  phone: "+919876543210",
  paymentMethod: "upi" as const,
};

async function placed() {
  const f = fakeOrderDeps();
  const r = await placeOrder(input, "cust-1", f.deps, now);
  if (!r.ok) throw new Error(r.error);
  return { ...f, id: r.data.orderId };
}

describe("completeMockPayment", () => {
  it("places the order with the promise computed at payment time and confirms by WhatsApp", async () => {
    const { deps, orders, calls, id } = await placed();
    const later = new Date(now.getTime() + 4 * 60_000);
    const r = await completeMockPayment({ orderId: id, outcome: "succeed" }, "cust-1", deps, later);
    expect(r).toEqual({ ok: true, data: { status: "placed", redirectTo: `/orders/${id}` } });
    const promised = orders.get(id)!.promised!;
    expect(promised.getTime() - later.getTime()).toBeGreaterThanOrEqual(35 * 60_000);
    expect(calls.messages[0]).toMatch(new RegExp(`${id} confirmed`));
  });

  it("is idempotent when Pay is tapped twice", async () => {
    const { deps, calls, id } = await placed();
    await completeMockPayment({ orderId: id, outcome: "succeed" }, "cust-1", deps, now);
    const again = await completeMockPayment({ orderId: id, outcome: "succeed" }, "cust-1", deps, now);
    expect(again).toEqual({ ok: true, data: { status: "placed", redirectTo: `/orders/${id}` } });
    expect(calls.confirmPayment).toBe(1);
  });

  it("keeps the order unpaid when the payment fails, so the customer can retry", async () => {
    const { deps, orders, id } = await placed();
    const r = await completeMockPayment({ orderId: id, outcome: "fail" }, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: true, data: { status: "awaiting_payment" } });
    expect(orders.get(id)).toMatchObject({ status: "awaiting_payment", paymentStatus: "failed" });
  });

  it("says so honestly when the payment times out", async () => {
    const { deps, id } = await placed();
    const r = await completeMockPayment({ orderId: id, outcome: "timeout" }, "cust-1", deps, now);
    expect(r).toMatchObject({ ok: true, data: { status: "awaiting_payment", message: expect.stringMatching(/couldn't confirm/) } });
  });

  it("refuses an expired order", async () => {
    const { deps, orders, id } = await placed();
    orders.get(id)!.status = "expired";
    const r = await completeMockPayment({ orderId: id, outcome: "succeed" }, "cust-1", deps, now);
    expect(r).toEqual({ ok: false, error: "This order expired. Start again from the menu." });
  });

  it("refuses if the order expires between loading and confirming", async () => {
    const f = await placed();
    f.deps.confirmPayment = async () => "expired";
    const r = await completeMockPayment({ orderId: f.id, outcome: "succeed" }, "cust-1", f.deps, now);
    expect(r).toEqual({ ok: false, error: "This order expired. Start again from the menu." });
  });

  it("does not reveal other customers' orders", async () => {
    const { deps, id } = await placed();
    const r = await completeMockPayment({ orderId: id, outcome: "succeed" }, "someone-else", deps, now);
    expect(r).toEqual({ ok: false, error: "Order not found" });
  });
});

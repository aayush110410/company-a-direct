import { describe, expect, it, vi } from "vitest";
import type { Session } from "../auth";
import { advanceOrderCore, cancelOrderCore, type KitchenDeps, overridePromiseCore, setItemStockCore } from "./core";

const now = new Date("2026-11-06T14:44:00Z");
const kitchen: Session = { userId: "u1", email: "k@x", role: "kitchen_staff", outletId: "o1", fullName: "K", phone: null };
const manager: Session = { ...kitchen, userId: "u2", role: "outlet_manager" };

function deps(over: Partial<KitchenDeps> = {}): KitchenDeps {
  return {
    getOrderMeta: vi.fn(async () => ({
      outletId: "o1",
      status: "placed" as const,
      promisedAt: new Date(now.getTime() + 40 * 60_000),
      travelMinutes: 12,
      customerPhone: "+919000000001",
    })),
    transition: vi.fn(async () => true),
    overridePromise: vi.fn(async () => true),
    upsertStock: vi.fn(async () => "saved" as const),
    ackAlert: vi.fn(async () => true),
    enqueue: vi.fn(async () => {}),
    ...over,
  };
}

describe("advanceOrderCore", () => {
  it("moves an order to its next stage", async () => {
    const d = deps();
    expect(await advanceOrderCore({ orderId: "WEB-1", from: "placed" }, kitchen, d)).toEqual({ ok: true, data: { status: "preparing" } });
    expect(d.transition).toHaveBeenCalledWith("WEB-1", "placed", "preparing", "u1", undefined);
  });

  it("returns a conflict when another tablet already moved it", async () => {
    const r = await advanceOrderCore({ orderId: "WEB-1", from: "placed" }, kitchen, deps({ transition: vi.fn(async () => false) }));
    expect(r).toEqual({ ok: false, error: "Order already moved", field: "conflict" });
  });

  it("refuses orders from another outlet", async () => {
    const r = await advanceOrderCore({ orderId: "WEB-1", from: "placed" }, { ...kitchen, outletId: "o2" }, deps());
    expect(r).toMatchObject({ ok: false, error: "Not your outlet" });
  });

  it("refuses moves the status machine doesn't allow", async () => {
    const r = await advanceOrderCore({ orderId: "WEB-1", from: "handed_to_rider" }, kitchen, deps());
    expect(r).toMatchObject({ ok: false, error: "Not allowed" });
  });
});

describe("cancelOrderCore", () => {
  it("needs a reason and tells the customer", async () => {
    const d = deps();
    expect(await cancelOrderCore({ orderId: "WEB-1", reason: " " }, kitchen, d)).toMatchObject({ ok: false, field: "reason" });
    expect(await cancelOrderCore({ orderId: "WEB-1", reason: "Gas supply cut" }, kitchen, d)).toMatchObject({ ok: true });
    expect(d.transition).toHaveBeenCalledWith("WEB-1", "placed", "cancelled", "u1", "Gas supply cut");
    expect(d.enqueue).toHaveBeenCalledWith(expect.objectContaining({ channel: "whatsapp", purpose: "transactional", orderId: "WEB-1" }));
  });
});

describe("overridePromiseCore", () => {
  it("is for managers only", async () => {
    const r = await overridePromiseCore({ orderId: "WEB-1", deltaMinutes: 10, reason: "Tandoor down" }, kitchen, deps(), now);
    expect(r).toMatchObject({ ok: false, error: "Not allowed" });
  });

  it("moves the promise and tells the customer the new time", async () => {
    const d = deps();
    const r = await overridePromiseCore({ orderId: "WEB-1", deltaMinutes: 10, reason: "Tandoor down" }, manager, d, now);
    expect(r.ok).toBe(true);
    const promised = new Date(now.getTime() + 50 * 60_000);
    expect(d.overridePromise).toHaveBeenCalledWith("WEB-1", promised, new Date(promised.getTime() - 12 * 60_000), "Tandoor down", "u2");
    expect(d.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: "promise_updated" }));
  });

  it("refuses pushes beyond the allowed window", async () => {
    const r = await overridePromiseCore({ orderId: "WEB-1", deltaMinutes: 90, reason: "Tandoor down" }, manager, deps(), now);
    expect(r).toMatchObject({ ok: false, field: "deltaMinutes" });
  });
});

describe("setItemStockCore", () => {
  it("upserts the outlet's own stock row, never deletes", async () => {
    const d = deps();
    await setItemStockCore({ itemId: "i1", status: "available" }, kitchen, d);
    expect(d.upsertStock).toHaveBeenCalledWith("o1", "i1", "available", "u1");
  });

  it("cannot bring back a dish the menu admin hid", async () => {
    const d = deps({ upsertStock: vi.fn(async () => "hidden" as const) });
    const r = await setItemStockCore({ itemId: "i1", status: "available" }, kitchen, d);
    expect(r).toMatchObject({ ok: false, error: "Hidden by the menu admin" });
  });

  it("needs an outlet", async () => {
    const r = await setItemStockCore({ itemId: "i1", status: "out_of_stock" }, { ...kitchen, role: "admin", outletId: null }, deps());
    expect(r).toMatchObject({ ok: false });
  });
});

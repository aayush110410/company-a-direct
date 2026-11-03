import { beforeAll, describe, expect, it } from "vitest";
import { admin, createUser, makeOrder, makeOutlet, sql, pauseCronDuringTests } from "./helpers";

pauseCronDuringTests();

let outletId: string;
let customerId: string;
let staffId: string;
const estimate = {
  model_version: null,
  features: { workload: 30, criticalItem: 18, queueLoad: 1, peak: 0 },
  predicted_minutes: 30,
  p80_minutes: 33,
  confidence: "normal",
  outlet_min_minutes: 35,
  source: "model",
};
const message = { channel: "whatsapp", to_phone: "+919000000001", template: "order_confirmed", body: "Confirmed" };
const count = async (table: string, orderId: string) =>
  Number((await sql<{ n: string }>(`select count(*) as n from ${table} where order_id = $1`, [orderId]))[0]!.n);

beforeAll(async () => {
  ({ outletId } = await makeOutlet());
  ({ userId: customerId } = await createUser("customer"));
  ({ userId: staffId } = await createUser("kitchen_staff", { outletId }));
});

describe("transition_order", () => {
  it("is single-winner under concurrent taps", async () => {
    const id = await makeOrder({ customerId, outletId });
    const args = { p_order_id: id, p_from: "placed", p_to: "preparing", p_actor: staffId };
    const [a, b] = await Promise.all([admin.rpc("transition_order", args), admin.rpc("transition_order", args)]);
    expect([a.data, b.data].sort()).toEqual([false, true]);
    expect(await count("order_events", id)).toBe(1);
    const [row] = await sql<{ status: string; preparing_at: Date | null }>("select status, preparing_at from orders where id = $1", [id]);
    expect(row?.status).toBe("preparing");
    expect(row?.preparing_at).not.toBeNull();
  });

  it("requires a reason to cancel", async () => {
    const id = await makeOrder({ customerId, outletId });
    const r = await admin.rpc("transition_order", { p_order_id: id, p_from: "placed", p_to: "cancelled", p_actor: staffId });
    expect(r.error?.message).toMatch(/needs a reason/);
    const ok = await admin.rpc("transition_order", {
      p_order_id: id,
      p_from: "placed",
      p_to: "cancelled",
      p_actor: staffId,
      p_reason: "Customer called to cancel",
    });
    expect(ok.data).toBe(true);
  });

  it("refuses to place an order (payment does that)", async () => {
    const id = await makeOrder({ customerId, outletId, status: "awaiting_payment", paidAt: null });
    const r = await admin.rpc("transition_order", { p_order_id: id, p_from: "awaiting_payment", p_to: "placed", p_actor: staffId });
    expect(r.error?.message).toMatch(/confirm_payment/);
  });

  it("records the actual prep minutes when the order is ready", async () => {
    const id = await makeOrder({ customerId, outletId, status: "preparing", paidAt: new Date(Date.now() - 25 * 60_000).toISOString() });
    await sql(
      "insert into prep_estimates (order_id, features, predicted_minutes, p80_minutes, confidence, outlet_min_minutes, source, promised_at) values ($1, '{}', 30, 33, 'normal', 35, 'model', now())",
      [id],
    );
    await admin.rpc("transition_order", { p_order_id: id, p_from: "preparing", p_to: "ready", p_actor: staffId });
    const [row] = await sql<{ actual_minutes: number }>("select actual_minutes from prep_estimates where order_id = $1", [id]);
    expect(row?.actual_minutes).toBeGreaterThanOrEqual(25);
    expect(row?.actual_minutes).toBeLessThanOrEqual(26);
  });
});

describe("confirm_payment", () => {
  const confirm = (id: string, promisedAt: Date) =>
    admin.rpc("confirm_payment", {
      p_order_id: id,
      p_promised_at: promisedAt.toISOString(),
      p_ready_by: new Date(promisedAt.getTime() - 12 * 60_000).toISOString(),
      p_estimate: estimate,
      p_message: message,
    });

  it("places the order with the final promise and writes everything once", async () => {
    const id = await makeOrder({ customerId, outletId, status: "awaiting_payment", paidAt: null });
    const promisedAt = new Date(Date.now() + 45 * 60_000);
    const { data } = await confirm(id, promisedAt);
    expect(data).toBe("placed");
    const [row] = await sql<{ status: string; paid_at: Date; promised_at: Date; ready_by: Date; payment_status: string }>(
      "select status, paid_at, promised_at, ready_by, payment_status from orders where id = $1",
      [id],
    );
    expect(row?.status).toBe("placed");
    expect(row?.paid_at).not.toBeNull();
    expect(row?.promised_at.getTime()).toBe(promisedAt.getTime());
    expect(row?.ready_by.getTime()).toBe(promisedAt.getTime() - 12 * 60_000);
    expect(row?.payment_status).toBe("succeeded");
  });

  it("is single-winner when Pay is tapped twice at once", async () => {
    const id = await makeOrder({ customerId, outletId, status: "awaiting_payment", paidAt: null });
    const promisedAt = new Date(Date.now() + 45 * 60_000);
    const [a, b] = await Promise.all([confirm(id, promisedAt), confirm(id, promisedAt)]);
    expect([a.data, b.data]).toEqual(["placed", "placed"]);
    expect(await count("prep_estimates", id)).toBe(1);
    expect(await count("order_events", id)).toBe(1);
    expect(await count("outbox_messages", id)).toBe(1);
  });

  it("does nothing to an expired order", async () => {
    const id = await makeOrder({ customerId, outletId, status: "expired", paidAt: null });
    await sql("update payments set status = 'pending' where order_id = $1", [id]);
    const { data } = await confirm(id, new Date(Date.now() + 45 * 60_000));
    expect(data).toBe("expired");
    const [p] = await sql<{ status: string }>("select status from payments where order_id = $1", [id]);
    expect(p?.status).toBe("pending");
    expect(await count("prep_estimates", id)).toBe(0);
  });
});

describe("override_promise", () => {
  it("moves the order's promise and marks the estimate as overridden", async () => {
    const id = await makeOrder({ customerId, outletId, status: "preparing" });
    await sql(
      "insert into prep_estimates (order_id, features, predicted_minutes, p80_minutes, confidence, outlet_min_minutes, source, promised_at) values ($1, '{}', 30, 33, 'normal', 35, 'model', now())",
      [id],
    );
    await sql("update orders set late_alerted_at = now(), revised_eta = now() where id = $1", [id]);
    const promisedAt = new Date(Date.now() + 60 * 60_000);
    const { data } = await admin.rpc("override_promise", {
      p_order_id: id,
      p_promised_at: promisedAt.toISOString(),
      p_ready_by: new Date(promisedAt.getTime() - 12 * 60_000).toISOString(),
      p_reason: "Tandoor down for 10 min",
      p_actor: staffId,
    });
    expect(data).toBe(true);
    const [o] = await sql<{ promised_at: Date; late_alerted_at: Date | null; revised_eta: Date | null }>(
      "select promised_at, late_alerted_at, revised_eta from orders where id = $1",
      [id],
    );
    expect(o?.promised_at.getTime()).toBe(promisedAt.getTime());
    expect(o?.late_alerted_at).toBeNull();
    expect(o?.revised_eta).toBeNull();
    const [e] = await sql<{ source: string; override_reason: string }>(
      "select source, override_reason from prep_estimates where order_id = $1",
      [id],
    );
    expect(e).toEqual({ source: "manager_override", override_reason: "Tandoor down for 10 min" });
  });
});

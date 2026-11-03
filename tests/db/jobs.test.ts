import { beforeAll, describe, expect, it } from "vitest";
import { admin, createUser, makeOrder, makeOutlet, sql, pauseCronDuringTests } from "./helpers";

pauseCronDuringTests();

let outletId: string;
let lonelyOutletId: string;
let customerId: string;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const run = async (ids: string[]) => (await admin.rpc("run_order_jobs", { p_order_ids: ids })).data as Record<string, number>;
const outbox = (id: string) => sql<{ channel: string; to_phone: string; body: string }>("select channel, to_phone, body from outbox_messages where order_id = $1 order by channel::text", [id]);

beforeAll(async () => {
  ({ outletId } = await makeOutlet());
  ({ outletId: lonelyOutletId } = await makeOutlet());
  ({ userId: customerId } = await createUser("customer"));
  await createUser("outlet_manager", { outletId, phone: "+919000000002" });
});

describe("late alerts", () => {
  it("fire exactly once, to the manager and the customer", async () => {
    const id = await makeOrder({ customerId, outletId, status: "preparing", promisedAt: minutesAgo(11) });
    expect((await run([id])).late).toBe(1);
    expect((await run([id])).late).toBe(0);

    const alerts = await sql("select kind, message from alerts where order_id = $1", [id]);
    expect(alerts).toHaveLength(1);
    const messages = await outbox(id);
    expect(messages.map((m) => [m.channel, m.to_phone])).toEqual([
      ["sms", "+919000000002"],
      ["whatsapp", "+919000000001"],
    ]);
    const [o] = await sql<{ revised_eta: Date | null; late_alerted_at: Date | null }>(
      "select revised_eta, late_alerted_at from orders where id = $1",
      [id],
    );
    expect(o?.late_alerted_at).not.toBeNull();
    // preparing: now + travel (12) + 10
    expect(o!.revised_eta!.getTime() - Date.now()).toBeGreaterThan(21 * 60_000);
  });

  it("ignore orders 9 minutes late and orders already delivered", async () => {
    const nineLate = await makeOrder({ customerId, outletId, status: "preparing", promisedAt: minutesAgo(9) });
    const delivered = await makeOrder({ customerId, outletId, status: "delivered", promisedAt: minutesAgo(30) });
    expect((await run([nineLate, delivered])).late).toBe(0);
  });

  it("still alert at an outlet with no manager", async () => {
    const id = await makeOrder({ customerId, outletId: lonelyOutletId, status: "placed", promisedAt: minutesAgo(15) });
    expect((await run([id])).late).toBe(1);
    expect(await sql("select id from alerts where order_id = $1", [id])).toHaveLength(1);
    expect((await outbox(id)).map((m) => m.channel)).toEqual(["whatsapp"]);
  });

  it("tell the customer the new estimate in IST", async () => {
    const id = await makeOrder({ customerId, outletId, status: "ready", promisedAt: minutesAgo(12) });
    await run([id]);
    const [o] = await sql<{ revised_eta: Date }>("select revised_eta from orders where id = $1", [id]);
    const ist = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true })
      .format(o!.revised_eta)
      .toLowerCase();
    const whatsapp = (await outbox(id)).find((m) => m.channel === "whatsapp");
    expect(whatsapp?.body).toContain(`New estimate ${ist}`);
  });
});

describe("expiry and mock delivery", () => {
  it("expires orders unpaid for 15 minutes", async () => {
    const stale = await makeOrder({ customerId, outletId, status: "awaiting_payment", placedAt: minutesAgo(16), paidAt: null });
    const fresh = await makeOrder({ customerId, outletId, status: "awaiting_payment", placedAt: minutesAgo(5), paidAt: null });
    expect((await run([stale, fresh])).expired).toBe(1);
    const rows = await sql<{ id: string; status: string; payment_status: string }>(
      "select id, status, payment_status from orders where id = any($1) order by id",
      [[stale, fresh]],
    );
    expect(rows.find((r) => r.id === stale)).toMatchObject({ status: "expired", payment_status: "expired" });
    expect(rows.find((r) => r.id === fresh)?.status).toBe("awaiting_payment");
  });

  it("delivers handed orders once the travel time has passed", async () => {
    const due = await makeOrder({ customerId, outletId, status: "handed_to_rider", handedAt: minutesAgo(13), travelMinutes: 12 });
    const enRoute = await makeOrder({ customerId, outletId, status: "handed_to_rider", handedAt: minutesAgo(5), travelMinutes: 12 });
    expect((await run([due, enRoute])).delivered).toBe(1);
    const [row] = await sql<{ status: string }>("select status from orders where id = $1", [due]);
    expect(row?.status).toBe("delivered");
    expect((await outbox(due))[0]?.body).toMatch(/delivered/);
  });
});

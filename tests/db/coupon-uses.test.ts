import { beforeAll, describe, expect, it } from "vitest";
import { orderDeps } from "@/server/orders/deps";
import { createUser, makeOrder, makeOutlet, pauseCronDuringTests, sql } from "./helpers";

pauseCronDuringTests();

let outletId: string;
let customerId: string;

beforeAll(async () => {
  ({ outletId } = await makeOutlet());
  ({ userId: customerId } = await createUser("customer"));
  await sql("insert into coupons (code, kind, value, valid_from, valid_to) values ('TESTUSES', 'flat', 5000, now() - interval '1 day', now() + interval '1 day') on conflict do nothing");
});

describe("coupon uses", () => {
  it("count only paid orders, so an abandoned checkout doesn't use one up", async () => {
    const unpaid = await makeOrder({ customerId, outletId, status: "awaiting_payment", paidAt: null });
    const paid = await makeOrder({ customerId, outletId, status: "placed" });
    const refunded = await makeOrder({ customerId, outletId, status: "cancelled" });
    await sql("update orders set coupon_code = 'TESTUSES' where id = any($1)", [[unpaid, paid, refunded]]);

    expect(await orderDeps().countCouponUses("TESTUSES", customerId)).toBe(1);
  });
});

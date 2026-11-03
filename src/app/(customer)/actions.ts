"use server";

import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { type ActionResult, fail, ok } from "@/lib/result";
import { requireActionRole } from "@/server/auth";
import { orderDeps } from "@/server/orders/deps";
import { countTicketsAhead, getOrderView, type OrderView } from "@/server/orders/order-view";
import { completeMockPayment } from "@/server/orders/payment";
import { placeOrder } from "@/server/orders/place-order";
import { type Quote, quoteOrder } from "@/server/orders/quote";
import { paySchema, placeOrderSchema, quoteSchema } from "@/server/orders/schemas";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { createAdminClient } from "@/server/supabase/admin";
import { createServerClient } from "@/server/supabase/server";

async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (e) {
    unstable_rethrow(e);
    console.error(e);
    return fail("Something went wrong on our side. Please try again.");
  }
}

function firstIssue(error: { issues: { message: string; path: PropertyKey[] }[] }) {
  const issue = error.issues[0]!;
  return fail(issue.message, String(issue.path[0] ?? ""));
}

export async function quoteOrderAction(input: unknown): Promise<ActionResult<Quote>> {
  return guarded(async () => {
    const auth = await requireActionRole(["customer"]);
    if (!auth.ok) return auth;
    if (!rateLimit(`quote:${auth.data.userId}`, 30, 60_000).allowed) return fail("Slow down a little and try again.");
    const p = quoteSchema.safeParse(input);
    if (!p.success) return firstIssue(p.error);
    return quoteOrder(p.data, auth.data.userId, orderDeps(), new Date());
  });
}

export async function placeOrderAction(input: unknown): Promise<ActionResult<{ orderId: string }>> {
  return guarded(async () => {
    const auth = await requireActionRole(["customer"]);
    if (!auth.ok) return auth;
    const limit = rateLimit(`place:${auth.data.userId}:${clientIp(await headers())}`, 10, 60_000);
    if (!limit.allowed) return fail("Too many orders in a minute. Wait a moment and try again.");
    const p = placeOrderSchema.safeParse(input);
    if (!p.success) return firstIssue(p.error);
    return placeOrder(p.data, auth.data.userId, orderDeps(), new Date());
  });
}

export async function payAction(input: unknown) {
  return guarded(async () => {
    const auth = await requireActionRole(["customer"]);
    if (!auth.ok) return auth;
    const p = paySchema.safeParse(input);
    if (!p.success) return fail("Invalid payment request");
    return completeMockPayment(p.data, auth.data.userId, orderDeps(), new Date());
  });
}

export async function getOrderViewAction(orderId: string): Promise<ActionResult<OrderView>> {
  return guarded(async () => {
    const auth = await requireActionRole(["customer"]);
    if (!auth.ok) return auth;
    if (!/^WEB-\d{6,}$/.test(orderId)) return fail("Order not found");
    const view = await getOrderView(await createServerClient(), orderId);
    if (!view) return fail("Order not found");
    return ok({ ...view, ticketsAhead: await countTicketsAhead(createAdminClient(), orderId) });
  });
}

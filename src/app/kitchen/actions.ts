"use server";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { BoardOrder, KitchenAlert } from "@/lib/realtime/board-reducer";
import { type ActionResult, fail, ok } from "@/lib/result";
import { requireActionRole } from "@/server/auth";
import { acknowledgeAlertCore, advanceOrderCore, cancelOrderCore, overridePromiseCore, setItemStockCore } from "@/server/kitchen/core";
import { kitchenDeps } from "@/server/kitchen/deps";
import { getBoard, getBoardOrder } from "@/server/repo/kitchen";
import { createServerClient } from "@/server/supabase/server";

const STAFF = ["kitchen_staff", "outlet_manager", "admin"] as const;
const orderId = z.string().regex(/^WEB-\d{6,}$/);
const status = z.enum(["awaiting_payment", "placed", "preparing", "ready", "handed_to_rider", "delivered", "expired", "cancelled"]);

async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (e) {
    unstable_rethrow(e);
    console.error(e);
    return fail("Something went wrong. Try again.");
  }
}

export async function advanceOrder(input: unknown) {
  return guarded(async () => {
    const auth = await requireActionRole([...STAFF]);
    if (!auth.ok) return auth;
    const p = z.object({ orderId, from: status }).safeParse(input);
    if (!p.success) return fail("Invalid request");
    return advanceOrderCore(p.data, auth.data, kitchenDeps());
  });
}

export async function cancelOrder(input: unknown) {
  return guarded(async () => {
    const auth = await requireActionRole([...STAFF]);
    if (!auth.ok) return auth;
    const p = z.object({ orderId, reason: z.string().max(120) }).safeParse(input);
    if (!p.success) return fail("Invalid request");
    return cancelOrderCore(p.data, auth.data, kitchenDeps());
  });
}

export async function overridePromise(input: unknown) {
  return guarded(async () => {
    const auth = await requireActionRole(["outlet_manager", "admin"]);
    if (!auth.ok) return auth;
    const p = z.object({ orderId, deltaMinutes: z.number().int().min(-120).max(240), reason: z.string().max(120) }).safeParse(input);
    if (!p.success) return fail("Invalid request");
    return overridePromiseCore(p.data, auth.data, kitchenDeps(), new Date());
  });
}

export async function setItemStock(input: unknown) {
  return guarded(async () => {
    const auth = await requireActionRole([...STAFF]);
    if (!auth.ok) return auth;
    const p = z.object({ itemId: z.uuid(), status: z.enum(["available", "out_of_stock"]), outletId: z.uuid().optional() }).safeParse(input);
    if (!p.success) return fail("Invalid request");
    return setItemStockCore(p.data, auth.data, kitchenDeps());
  });
}

export async function acknowledgeAlert(input: unknown) {
  return guarded(async () => {
    const auth = await requireActionRole(["outlet_manager", "admin"]);
    if (!auth.ok) return auth;
    const p = z.object({ alertId: z.uuid() }).safeParse(input);
    if (!p.success) return fail("Invalid request");
    return acknowledgeAlertCore(p.data, auth.data, kitchenDeps());
  });
}

/** Reads go through RLS as the signed-in staff member. */
export async function getBoardOrderAction(id: string): Promise<ActionResult<BoardOrder | null>> {
  return guarded(async () => {
    const auth = await requireActionRole([...STAFF]);
    if (!auth.ok) return auth;
    if (!orderId.safeParse(id).success) return fail("Invalid order");
    return ok(await getBoardOrder(await createServerClient(), id));
  });
}

export async function getBoardAction(outletId: string): Promise<ActionResult<{ orders: BoardOrder[]; alerts: KitchenAlert[] }>> {
  return guarded(async () => {
    const auth = await requireActionRole([...STAFF]);
    if (!auth.ok) return auth;
    if (!z.uuid().safeParse(outletId).success) return fail("Invalid outlet");
    if (auth.data.role !== "admin" && auth.data.outletId !== outletId) return fail("Not your outlet");
    return ok(await getBoard(await createServerClient(), outletId));
  });
}

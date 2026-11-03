import { type ActionResult, ok } from "@/lib/result";
import { isFailure, prepareOrder } from "./prepare";
import type { OrderDeps, QuoteInput } from "./types";

export type Quote = {
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  gstPaise: number;
  promisedAt: string;
  promiseMinutes: number;
  confidence: "normal" | "low";
  unavailable: { index: number; reason: string }[];
  couponError?: string;
};

/** Live checkout numbers: what the order costs and when it will honestly arrive, right now. */
export async function quoteOrder(input: QuoteInput, customerId: string, deps: OrderDeps, now: Date): Promise<ActionResult<Quote>> {
  const p = await prepareOrder(input, customerId, deps, now);
  if (isFailure(p)) return p;
  return ok({
    subtotalPaise: p.subtotalPaise,
    discountPaise: p.discountPaise,
    totalPaise: p.totalPaise,
    gstPaise: p.gstPaise,
    promisedAt: p.promise.promisedAt.toISOString(),
    promiseMinutes: p.promise.promiseMinutes,
    confidence: p.estimate.confidence,
    unavailable: p.unavailable,
    ...(p.couponError ? { couponError: p.couponError } : {}),
  });
}

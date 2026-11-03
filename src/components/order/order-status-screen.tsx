"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { buttonClasses, LivePill, Price } from "@/components/ui";
import { formatIstTime } from "@/domain/time";
import { customerStatusLabel, minutesLate } from "@/domain/urgency";
import { cn } from "@/lib/cn";
import { useLiveOrder } from "@/lib/realtime/use-live-order";
import type { OrderView } from "@/server/orders/order-view";
import { Rail } from "../kitchen/rail";
import { MiniTicket, TicketPaper } from "../kitchen/ticket-paper";
import { useNow } from "../kitchen/use-now";

const STAGE_LABEL: Partial<Record<OrderView["status"], string>> = {
  placed: "On the rail",
  preparing: "Cooking",
  ready: "Packed",
  handed_to_rider: "With your rider",
  delivered: "Delivered",
};

function railCaption(o: OrderView): string {
  if (o.status !== "placed" && o.status !== "preparing") return "The kitchen has finished with your ticket.";
  if (o.ticketsAhead === null || o.status === "preparing") return "Your order is being cooked now.";
  if (o.ticketsAhead === 0) return "Yours is next on the rail.";
  return `${o.ticketsAhead} ${o.ticketsAhead === 1 ? "ticket" : "tickets"} ahead of yours.`;
}

const STAGES = [
  { key: "placed", label: "Order on the rail", at: (o: OrderView) => o.paidAt },
  { key: "preparing", label: "Cooking", at: (o: OrderView) => o.preparingAt },
  { key: "ready", label: "Packed and ready", at: (o: OrderView) => o.readyAt },
  { key: "handed_to_rider", label: "With your rider", at: (o: OrderView) => o.handedAt },
  { key: "delivered", label: "Delivered", at: (o: OrderView) => o.deliveredAt },
] as const;


/** Mini tickets shown before the rest collapse to a count; fits a 360 px phone. */
const MAX_MINI = 4;
export function OrderStatusScreen({ initial, justPaid }: { initial: OrderView; justPaid: boolean }) {
  const { order, connection } = useLiveOrder(initial.id, initial);
  const now = useNow(15_000);
  const promised = new Date(order.promisedAt);
  const revised = order.revisedEta ? new Date(order.revisedEta) : null;
  const label = customerStatusLabel({ status: order.status, promisedAt: promised, revisedEta: revised }, now);
  const late = order.status !== "delivered" && minutesLate(promised, now) > 0;
  const reached = STAGES.findIndex((s) => s.key === order.status);

  if (order.status === "cancelled") {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pt-16">
        <h1 className="font-display text-4xl">Order {order.id} was cancelled</h1>
        <p className="mt-3 text-muted">
          {order.cancelReason ? `The kitchen said: ${order.cancelReason}. ` : ""}Your payment will be refunded in full. We&rsquo;re sorry.
        </p>
        <Link href="/" className={cn(buttonClasses("primary", "lg"), "mt-8")}>
          Order again
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-12 px-5 pt-10 pb-24 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted">
            Order {order.id} · {order.outletName} kitchen
          </p>
          <LivePill state={connection} />
        </div>
        <h1 className={cn("mt-4 font-display text-[clamp(2.5rem,8vw,4.5rem)] leading-[0.98] tracking-[-0.02em]", late && "text-[var(--late-text)]")}>
          {order.status === "delivered" ? "Delivered. Enjoy." : late ? label : `Arrives by ${formatIstTime(revised ?? promised)}`}
        </h1>
        {late && revised && <p className="mt-3 text-lg text-muted">The kitchen knows, and we&rsquo;ve updated your estimate. Sorry for the wait.</p>}
        {!late && order.status !== "delivered" && (
          <p className="mt-3 text-lg text-muted">
            {order.confidence === "low" ? "The kitchen is busy, so this time includes a safety margin." : "Based on how busy the kitchen is right now."}
          </p>
        )}

        <ol className="mt-12 flex flex-col">
          {STAGES.map((s, i) => {
            const done = i <= reached;
            const current = i === reached;
            const at = s.at(order);
            return (
              <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0">
                {i < STAGES.length - 1 && <span aria-hidden className={cn("absolute top-7 left-[13px] h-full w-px", done && i < reached ? "bg-accent" : "bg-seam")} />}
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border",
                    done ? "border-accent bg-accent text-on-accent" : "border-seam bg-bg",
                    current && "ring-4 ring-accent/25",
                  )}
                >
                  {done && <Check className="size-4" strokeWidth={3} />}
                </span>
                <div className="pt-0.5">
                  <p className={cn("text-lg", done ? "font-semibold" : "text-muted")}>{s.label}</p>
                  {at && <p className="text-sm text-muted tabular-nums">{formatIstTime(new Date(at))}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="min-w-0">
        <h2 className="section-title mb-4">Your ticket on the {order.outletName} rail</h2>
        {/* The same paper ticket the kitchen sees, hanging on the same rail behind the orders ahead of it. */}
        {/* The outlet's rail: the queue ahead (anonymous) and your ticket, clipped on. */}
        <Rail caption={railCaption(order)}>
          <div className="flex items-start gap-2">
            {Array.from({ length: Math.min(order.ticketsAhead ?? 0, MAX_MINI) }, (_, i) => (
              <MiniTicket key={i} />
            ))}
            {(order.ticketsAhead ?? 0) > MAX_MINI && (
              <span className="pt-4 text-sm text-muted tabular-nums">+{(order.ticketsAhead ?? 0) - MAX_MINI}</span>
            )}
            <MiniTicket mine number={order.id} dropped={justPaid} />
          </div>
        </Rail>
        <TicketPaper
              label={`Your ticket, order ${order.id}`}
              number={order.id.replace("WEB-", "")}
              status={STAGE_LABEL[order.status] ?? label}
              tone={late ? "late" : "steel"}
              size="customer"
              clip={false}
              className="mt-6"
            >
              <ul className="flex flex-col gap-1.5 px-4 py-3">
                {order.items.map((i, n) => (
                  <li key={n} className="flex justify-between gap-3">
                    <span>
                      <b className="tabular-nums">{i.qty}×</b> {i.name}
                      {i.portion !== "Single" && ` · ${i.portion}`}
                      {i.addons.length > 0 && <span className="block text-sm text-ink-muted">+ {i.addons.join(", ")}</span>}
                    </span>
                    <Price paise={i.unitPaise * i.qty} className="shrink-0" />
                  </li>
                ))}
              </ul>
              <footer className="border-t border-dashed border-paper-seam px-4 py-3 text-sm">
                {order.discountPaise > 0 && (
                  <p className="flex justify-between">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      − <Price paise={order.discountPaise} />
                    </span>
                  </p>
                )}
                <p className="flex justify-between text-base font-bold">
                  <span>Paid ({order.paymentMethod === "upi" ? "UPI" : "Card"})</span>
                  <Price paise={order.totalPaise} />
                </p>
                <p className="mt-1 text-ink-muted">
                  Includes <Price paise={order.gstPaise} /> GST · FSSAI Lic. {order.outletFssai}
                </p>
              </footer>
        </TicketPaper>
      </aside>
    </main>
  );
}

"use client";

import { Clock3, Gauge } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { advanceOrder } from "@/app/kitchen/actions";
import { Button } from "@/components/ui";
import { kitchenActionLabel } from "@/domain/order-status";
import { formatIstTime } from "@/domain/time";
import { kitchenUrgency, minutesLate } from "@/domain/urgency";
import { cn } from "@/lib/cn";
import type { BoardOrder } from "@/lib/realtime/board-reducer";

const BAND = {
  on_time: "bg-[#34312b] text-paper",
  at_risk: "bg-risk text-ink",
  late: "bg-late text-white",
} as const;

/** A paper ticket on the rail: order number big enough to read across the kitchen. */
export function Ticket({
  order,
  now,
  isNew,
  onSeen,
  canManage,
  onAdjust,
  onCancel,
  onMoved,
}: {
  order: BoardOrder;
  now: Date;
  isNew: boolean;
  onSeen: () => void;
  canManage: boolean;
  onAdjust: () => void;
  onCancel: () => void;
  onMoved: () => void;
}) {
  const [pending, start] = useTransition();
  const [dropped, setDropped] = useState(isNew);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => {
      setDropped(false);
      onSeen();
    }, 1200);
    return () => clearTimeout(t);
  }, [isNew, onSeen]);

  const readyBy = new Date(order.readyBy);
  const urgency = kitchenUrgency({ status: order.status, readyBy }, now);
  const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(order.paidAt).getTime()) / 60_000));
  const action = kitchenActionLabel(order.status);
  const lateBy = minutesLate(readyBy, now);
  const withRider = order.status === "handed_to_rider";
  const showAdjust = canManage && !withRider;
  const showCancel = order.status === "placed" || order.status === "preparing";

  const statusText =
    urgency === "late" ? `Late by ${lateBy} min` : urgency === "at_risk" ? "At risk" : withRider ? "With rider" : order.status === "ready" ? "Ready" : `Ready by ${formatIstTime(readyBy)}`;

  const advance = () =>
    start(async () => {
      const r = await advanceOrder({ orderId: order.id, from: order.status });
      if (!r.ok) {
        toast.error(r.error, { description: r.field === "conflict" ? "Another screen moved it first. Board refreshed." : undefined });
      }
      onMoved();
    });

  return (
    <article
      ref={ref}
      aria-label={`Order ${order.id}, ${statusText}`}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-ticket)] bg-paper text-ink shadow-[0_22px_40px_-22px_rgba(0,0,0,0.9)]",
        dropped && "motion-safe:animate-ticket-drop ring-4 ring-accent/70",
        withRider && "opacity-75",
      )}
    >
      <header className={cn("flex items-baseline justify-between gap-3 px-4 py-2.5", BAND[urgency])}>
        <span className="text-[2rem] leading-none font-bold tracking-[-0.02em] tabular-nums">{order.id.replace("WEB-", "")}</span>
        <span className="text-right text-[1rem] leading-tight font-semibold">{statusText}</span>
      </header>

      {!withRider && (
        <ul className="flex flex-col gap-1.5 px-4 pt-3 pb-2">
          {order.items.map((i, n) => (
            <li key={n} className="text-[1.375rem] leading-snug">
              <b className="tabular-nums">{i.qty}×</b> {i.name}
              {i.portion !== "Single" && <span className="font-semibold"> · {i.portion}</span>}
              {i.addons.length > 0 && <span className="block text-[1rem] text-ink-muted">+ {i.addons.join(", ")}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 text-[1rem] text-ink-muted">
        <span className="flex items-center gap-1.5 tabular-nums">
          <Clock3 className="size-4" aria-hidden />
          {elapsed} min in
        </span>
        {order.confidence === "low" && (
          <span className="flex items-center gap-1.5 font-semibold text-risk" title="Kitchen is busier than usual; the estimate has a wider margin">
            <Gauge className="size-4" aria-hidden />
            Low confidence
          </span>
        )}
        {order.source === "manager_override" && <span className="font-semibold">Time adjusted</span>}
      </div>

      {action && (
        <div className="border-t border-paper-seam p-3">
          <Button size="xl" loading={pending} onClick={advance} className="w-full bg-ink text-paper hover:bg-[#2a2826]">
            {action}
          </Button>
        </div>
      )}
      {showAdjust || showCancel ? (
        <footer className="flex items-center justify-between gap-3 px-4 pb-3 text-[0.9375rem]">
          {showAdjust ? (
            <button type="button" onClick={onAdjust} className="min-h-11 font-semibold underline decoration-paper-seam underline-offset-4 hover:decoration-ink">
              Adjust time
            </button>
          ) : (
            <span />
          )}
          {showCancel && (
            <button type="button" onClick={onCancel} className="min-h-11 text-ink-muted underline decoration-paper-seam underline-offset-4 hover:text-late">
              Cancel order
            </button>
          )}
        </footer>
      ) : null}
    </article>
  );
}

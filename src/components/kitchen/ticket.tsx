"use client";

import { Clock3, Gauge } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { advanceOrder } from "@/app/kitchen/actions";
import { Button } from "@/components/ui";
import { kitchenActionLabel } from "@/domain/order-status";
import { formatIstTime } from "@/domain/time";
import { kitchenUrgency, minutesLate } from "@/domain/urgency";
import type { BoardOrder } from "@/lib/realtime/board-reducer";
import { type BandTone, TicketPaper } from "./ticket-paper";

const TONE = { on_time: "steel", at_risk: "risk", late: "late" } as const satisfies Record<string, BandTone>;

/** A ticket on the kitchen rail: order number big enough to read across the kitchen, one action. */
export function Ticket({
  order,
  now,
  isNew,
  onSeen,
  canManage,
  onAdjust,
  onCancel,
  onMoved,
  onRail = true,
}: {
  order: BoardOrder;
  now: Date;
  isNew: boolean;
  onSeen: () => void;
  canManage: boolean;
  onAdjust: () => void;
  onCancel: () => void;
  onMoved: () => void;
  /** First in its column, so its clip sits on the rail. */
  onRail?: boolean;
}) {
  const [pending, start] = useTransition();
  const [dropped, setDropped] = useState(isNew);

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
  const withRider = order.status === "handed_to_rider";
  const showAdjust = canManage && !withRider;
  const showCancel = order.status === "placed" || order.status === "preparing";

  // The kitchen works to "ready by" (promise minus travel), so lateness here is measured against it.
  const statusText =
    urgency === "late"
      ? `${minutesLate(readyBy, now)} min past ready-by`
      : urgency === "at_risk"
        ? `At risk · ready by ${formatIstTime(readyBy)}`
        : withRider
          ? "With rider"
          : order.status === "ready"
            ? "Ready"
            : `Ready by ${formatIstTime(readyBy)}`;

  const advance = () =>
    start(async () => {
      const r = await advanceOrder({ orderId: order.id, from: order.status });
      if (!r.ok) {
        toast.error(r.error, { description: r.field === "conflict" ? "Another screen moved it first. Board refreshed." : undefined });
      }
      onMoved();
    });

  return (
    <TicketPaper
      label={`Order ${order.id}, ${statusText}`}
      number={order.id.replace("WEB-", "")}
      status={statusText}
      tone={TONE[urgency]}
      dropped={dropped}
      muted={withRider}
      clip={onRail}
      className={dropped ? "ring-4 ring-accent/70" : undefined}
    >
      {!withRider && (
        <ul className="flex flex-col gap-2 px-4 pt-3 pb-2">
          {order.items.map((i, n) => (
            <li key={n} className="text-[1.5rem] leading-snug">
              <b className="tabular-nums">{i.qty}×</b> {i.name}
              {i.portion !== "Single" && <span className="font-semibold"> · {i.portion}</span>}
              {i.addons.length > 0 && <span className="block text-[1.125rem] text-ink-muted">+ {i.addons.join(", ")}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 pb-3 text-[1.125rem] text-ink-muted">
        <span className="flex items-center gap-1.5 tabular-nums">
          <Clock3 className="size-5" aria-hidden />
          {elapsed} min in
        </span>
        {order.confidence === "low" && (
          <span className="flex items-center gap-1.5 font-semibold text-[var(--risk-on-paper)]" title="Kitchen is busier than usual; the estimate has a wider margin">
            <Gauge className="size-5" aria-hidden />
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
      {(showAdjust || showCancel) && (
        <footer className="grid grid-cols-2 gap-2 px-3 pb-3">
          {showAdjust ? (
            <button type="button" onClick={onAdjust} className="min-h-16 rounded-xl border border-paper-seam text-[1.125rem] font-semibold hover:bg-white">
              Adjust time
            </button>
          ) : (
            <span />
          )}
          {showCancel && (
            <button type="button" onClick={onCancel} className="min-h-16 rounded-xl text-[1.125rem] text-ink-muted hover:bg-white hover:text-late">
              Cancel order
            </button>
          )}
        </footer>
      )}
    </TicketPaper>
  );
}

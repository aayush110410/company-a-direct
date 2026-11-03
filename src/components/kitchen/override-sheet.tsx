"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { overridePromise } from "@/app/kitchen/actions";
import { Button, Sheet } from "@/components/ui";
import { formatIstTime } from "@/domain/time";
import { cn } from "@/lib/cn";
import type { BoardOrder } from "@/lib/realtime/board-reducer";

const STEPS = [-10, -5, 5, 10, 15, 20] as const;
const REASONS = ["Big order in the queue", "Equipment issue", "Ingredient running low", "Rider delayed"];

/** The manager's override: the model's estimate is a starting point, not the last word. */
export function OverrideSheet({ order, onClose, onDone }: { order: BoardOrder | null; onClose: () => void; onDone: () => void }) {
  return order ? <OverrideBody key={order.id} order={order} onClose={onClose} onDone={onDone} /> : null;
}

function OverrideBody({ order, onClose, onDone }: { order: BoardOrder; onClose: () => void; onDone: () => void }) {
  const [delta, setDelta] = useState(10);
  const [reason, setReason] = useState(REASONS[0]!);
  const [pending, start] = useTransition();
  const current = new Date(order.promisedAt);
  const next = new Date(current.getTime() + delta * 60_000);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={`Adjust ${order.id}`} description={`Promised to the customer for ${formatIstTime(current)}`} className="!text-lg">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Change">
          {STEPS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={delta === s}
              onClick={() => setDelta(s)}
              className={cn("min-h-16 rounded-xl border text-xl font-semibold tabular-nums", delta === s ? "border-fg bg-fg text-bg" : "border-seam")}
            >
              {s > 0 ? `+${s}` : s} min
            </button>
          ))}
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-base font-medium">Why</legend>
          {REASONS.map((r) => (
            <label key={r} className="flex min-h-16 items-center gap-3 border-b border-seam text-lg last:border-0">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-[var(--accent)]" />
              {r}
            </label>
          ))}
        </fieldset>
        <Button
          size="xl"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await overridePromise({ orderId: order.id, deltaMinutes: delta, reason });
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
              toast.success(`${order.id} now promised for ${formatIstTime(next)}`, { description: "The customer has been told." });
              onDone();
              onClose();
            })
          }
        >
          Promise {formatIstTime(next)} and tell the customer
        </Button>
      </div>
    </Sheet>
  );
}

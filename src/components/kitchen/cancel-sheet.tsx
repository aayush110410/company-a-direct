"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelOrder } from "@/app/kitchen/actions";
import { Button, Sheet } from "@/components/ui";
import type { BoardOrder } from "@/lib/realtime/board-reducer";

const REASONS = ["Item ran out after the order", "Kitchen can't fulfil in time", "Customer asked to cancel"];

/** Cancelling is destructive, so it lives behind its own sheet with a required reason. */
export function CancelSheet({ order, onClose, onDone }: { order: BoardOrder | null; onClose: () => void; onDone: () => void }) {
  return order ? <CancelBody key={order.id} order={order} onClose={onClose} onDone={onDone} /> : null;
}

function CancelBody({ order, onClose, onDone }: { order: BoardOrder; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState(REASONS[0]!);
  const [pending, start] = useTransition();
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={`Cancel ${order.id}?`} description="The customer is told at once and refunded in full.">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-base font-medium">Reason</legend>
        {REASONS.map((r) => (
          <label key={r} className="flex min-h-14 items-center gap-3 border-b border-seam text-base last:border-0">
            <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-[var(--accent)]" />
            {r}
          </label>
        ))}
      </fieldset>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          variant="danger"
          size="xl"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelOrder({ orderId: order.id, reason });
              if (!r.ok) toast.error(r.error);
              else toast.success(`${order.id} cancelled`, { description: "The customer has been told." });
              onDone();
              onClose();
            })
          }
        >
          Cancel order
        </Button>
        <Button variant="ghost" size="xl" onClick={onClose}>
          Keep cooking
        </Button>
      </div>
    </Sheet>
  );
}

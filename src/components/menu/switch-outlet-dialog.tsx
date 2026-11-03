"use client";

import { Button, Sheet } from "@/components/ui";

/** A cart belongs to one kitchen: prices and stock differ by outlet and city. */
export function SwitchOutletDialog({
  open,
  from,
  to,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  from: string;
  to: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()} title={`Start a new cart at ${to}?`}>
      <p className="text-muted">
        Your cart has items from {from}. Each kitchen has its own prices and stock, so we&rsquo;ll clear it and start fresh at {to}.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button size="lg" onClick={onConfirm}>
          Start new cart
        </Button>
        <Button size="lg" variant="ghost" onClick={onCancel}>
          Keep my {from} cart
        </Button>
      </div>
    </Sheet>
  );
}

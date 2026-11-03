"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setItemStock } from "@/app/kitchen/actions";
import { Sheet } from "@/components/ui";
import { cn } from "@/lib/cn";

export type StockItem = { itemId: string; name: string; category: string; status: "available" | "out_of_stock" };

/** Pause an item the moment it runs out; every open customer menu greys it within seconds. */
export function StockDrawer({
  open,
  onOpenChange,
  items,
  outletId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: StockItem[];
  outletId?: string;
}) {
  const [state, setState] = useState(() => Object.fromEntries(items.map((i) => [i.itemId, i.status])));
  const [, start] = useTransition();

  const toggle = (item: StockItem) => {
    const next = state[item.itemId] === "out_of_stock" ? "available" : "out_of_stock";
    setState((s) => ({ ...s, [item.itemId]: next }));
    start(async () => {
      const r = await setItemStock({ itemId: item.itemId, status: next, outletId });
      if (!r.ok) {
        setState((s) => ({ ...s, [item.itemId]: item.status }));
        toast.error(r.error);
      } else toast.success(next === "out_of_stock" ? `${item.name} paused on the menu` : `${item.name} back on the menu`);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Stock" description="Sold-out items are paused on every customer menu at once.">
      <ul className="flex flex-col">
        {items.map((item) => {
          const out = state[item.itemId] === "out_of_stock";
          return (
            <li key={item.itemId} className="flex min-h-16 items-center justify-between gap-4 border-b border-seam last:border-0">
              <span>
                <span className="block text-lg font-semibold">{item.name}</span>
                <span className="block text-sm text-muted">{item.category}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!out}
                aria-label={`${item.name} in stock`}
                onClick={() => toggle(item)}
                className={cn("min-h-12 min-w-32 rounded-xl border px-4 text-base font-semibold", out ? "border-late/70 text-[var(--late-text)]" : "border-ok/60 text-[var(--ok-text)]")}
              >
                {out ? "Sold out" : "In stock"}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

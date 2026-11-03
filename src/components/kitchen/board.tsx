"use client";

import { BellRing, PackageX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { acknowledgeAlert } from "@/app/kitchen/actions";
import { Button, LivePill } from "@/components/ui";
import { KITCHEN_COLUMNS } from "@/domain/order-status";
import { cn } from "@/lib/cn";
import { chime } from "@/lib/kitchen/chime";
import type { BoardOrder, KitchenAlert } from "@/lib/realtime/board-reducer";
import { useLiveBoard } from "@/lib/realtime/use-live-board";
import { CancelSheet } from "./cancel-sheet";
import { KitchenClock } from "./clock";
import { OverrideSheet } from "./override-sheet";
import { ShiftStartOverlay } from "./shift-start-overlay";
import { Rail } from "./rail";
import { StockDrawer, type StockItem } from "./stock-drawer";
import { Ticket } from "./ticket";
import { useNow } from "./use-now";

export function KitchenBoard({
  outlet,
  initial,
  stock,
  role,
  staffName,
  demo,
}: {
  outlet: { id: string; name: string };
  initial: { orders: BoardOrder[]; alerts: KitchenAlert[] };
  stock: StockItem[];
  role: "kitchen_staff" | "outlet_manager" | "admin";
  staffName: string;
  demo: boolean;
}) {
  const board = useLiveBoard(outlet.id, initial, { demo });
  const now = useNow(15_000);
  const [tab, setTab] = useState<(typeof KITCHEN_COLUMNS)[number]["key"]>("placed");
  const [adjusting, setAdjusting] = useState<BoardOrder | null>(null);
  const [cancelling, setCancelling] = useState<BoardOrder | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const canManage = role !== "kitchen_staff";

  // One chime per batch of new tickets.
  const newCount = board.newOrderIds.size;
  useEffect(() => {
    if (newCount > 0) chime.play();
  }, [newCount]);

  const columns = useMemo(
    () => KITCHEN_COLUMNS.map((c) => ({ ...c, orders: board.orders.filter((o) => o.status === c.key) })),
    [board.orders],
  );
  const onMoved = useCallback(() => void board.refresh(), [board]);

  return (
    <div className="flex min-h-dvh flex-col">
      <ShiftStartOverlay outletName={outlet.name} />
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-seam px-5 py-3">
        <div className="mr-auto">
          <h1 className="font-display text-[2rem] leading-tight">{outlet.name}</h1>
        </div>
        <KitchenClock />
        <LivePill state={board.connection} className="text-base" />
        <Button variant="secondary" size="xl" onClick={() => setStockOpen(true)}>
          <PackageX className="size-5" aria-hidden />
          Stock
        </Button>
        <p className="text-base text-muted">
          {staffName} · {role === "kitchen_staff" ? "Kitchen" : role === "outlet_manager" ? "Manager" : "Admin"}
        </p>
      </header>

      {canManage && board.alerts.length > 0 && (
        <section aria-label="Late order alerts" className="flex flex-col gap-2 border-b border-late/40 bg-late/15 px-5 py-3">
          {board.alerts.map((a) => (
            <AlertRow key={a.id} alert={a} onDone={onMoved} />
          ))}
        </section>
      )}

      {/* Portrait tablets: one column at a time. */}
      <nav aria-label="Board columns" className="flex gap-1 border-b border-seam px-3 py-2 lg:hidden">
        {columns.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setTab(c.key)}
            aria-pressed={tab === c.key}
            className={cn("min-h-16 flex-1 rounded-xl text-lg font-semibold", tab === c.key ? "bg-fg text-bg" : "text-muted")}
          >
            {c.title} <span className="tabular-nums">{c.orders.length}</span>
          </button>
        ))}
      </nav>

      <main className="grid flex-1 gap-5 p-5 lg:grid-cols-4">
        {columns.map((c) => (
          <section key={c.key} aria-labelledby={`col-${c.key}`} className={cn("flex min-w-0 flex-col", tab !== c.key && "hidden lg:flex")}>
            <div className="mb-2 flex items-center justify-between">
              <h2 id={`col-${c.key}`} className="text-[1.375rem] font-semibold">
                {c.title}
              </h2>
              <span className="text-[1.375rem] text-muted tabular-nums">{c.orders.length}</span>
            </div>
            {/* Tickets hang from the rail by their clips. */}
            <Rail className="pt-3">
              {c.orders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-seam px-4 py-8 text-center text-base text-muted">
                  {c.key === "placed" ? "No new tickets. New orders drop in here with a chime." : "Nothing here."}
                </p>
              ) : (
                c.orders.map((o, i) => (
                  <Ticket
                    onRail={i === 0}
                    key={o.id}
                    order={o}
                    now={now}
                    isNew={board.newOrderIds.has(o.id)}
                    onSeen={() => board.consumeNew(o.id)}
                    canManage={canManage}
                    onAdjust={() => setAdjusting(o)}
                    onCancel={() => setCancelling(o)}
                    onMoved={onMoved}
                  />
                ))
              )}
            </Rail>
          </section>
        ))}
      </main>

      <OverrideSheet order={adjusting} onClose={() => setAdjusting(null)} onDone={onMoved} />
      <CancelSheet order={cancelling} onClose={() => setCancelling(null)} onDone={onMoved} />
      <StockDrawer open={stockOpen} onOpenChange={setStockOpen} items={stock} outletId={role === "admin" ? outlet.id : undefined} />
    </div>
  );
}

function AlertRow({ alert, onDone }: { alert: KitchenAlert; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-3 text-[1.125rem] font-semibold">
        <BellRing className="size-5 text-[var(--late-text)]" aria-hidden />
        {alert.message.replace(/^WEB-(\d+) is (\d+) min past its promise$/, "$1 · customer promise missed by $2 min")} · a new estimate has been sent
      </p>
      <Button
        variant="secondary"
        size="xl"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await acknowledgeAlert({ alertId: alert.id });
            if (!r.ok) toast.error(r.error);
            onDone();
          })
        }
      >
        Acknowledge
      </Button>
    </div>
  );
}

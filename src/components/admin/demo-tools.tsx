"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resetDemo, simulateRush } from "@/app/admin/actions";
import { Button } from "@/components/ui";

/** Tools for reviewers: put the demo back to "now", or throw a dinner rush at a kitchen. */
export function DemoTools({ outlets }: { outlets: { id: string; name: string; slug: string }[] }) {
  const [outletId, setOutletId] = useState(outlets.find((o) => o.slug === "kondapur")?.id ?? outlets[0]?.id ?? "");
  const [count, setCount] = useState(8);
  const [result, setResult] = useState<string | null>(null);
  const [resetting, startReset] = useTransition();
  const [rushing, startRush] = useTransition();
  const outlet = outlets.find((o) => o.id === outletId);

  return (
    <main className="flex max-w-3xl flex-col gap-12">
      <header>
        <h1 className="font-display text-4xl">Demo tools</h1>
        <p className="mt-1 text-muted">For reviewers and sales demos. Switched off when DEMO_MODE is false.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Reset to the brief&rsquo;s sample orders</h2>
        <p className="text-muted">
          Clears all orders and messages, then recreates WEB-778120, WEB-778131 and WEB-778146 timed to now (WEB-778146 runs 4 minutes late, so its alert
          fires about 6 minutes later), plus a busy Kondapur dinner service.
        </p>
        <Button
          variant="danger"
          className="self-start"
          loading={resetting}
          onClick={() =>
            startReset(async () => {
              const r = await resetDemo();
              if (!r.ok) toast.error(r.error);
              else toast.success(`Demo reset: ${r.data.orders} live orders`);
            })
          }
        >
          Reset demo data
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Simulate a dinner rush</h2>
        <p className="text-muted">
          Sends paid orders to one kitchen through the real estimate. Watch them land on its kitchen screen and the quoted prep time stretch as the
          queue grows.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Kitchen
            <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="h-12 rounded-lg border border-seam bg-raised px-3 font-normal">
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Orders
            <input type="number" min={1} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-12 w-24 rounded-lg border border-seam bg-raised px-3 tabular-nums" />
          </label>
          <Button
            size="lg"
            loading={rushing}
            onClick={() =>
              startRush(async () => {
                const r = await simulateRush({ outletId, count });
                if (!r.ok) return void toast.error(r.error);
                const ref = r.data.reference;
                setResult(
                  `${r.data.orderIds.length} orders sent. A ${ref.name} now quotes ${ref.afterMinutes} min in the kitchen, up from ${ref.beforeMinutes} min before the rush.`,
                );
              })
            }
          >
            Send the rush
          </Button>
        </div>
        {result && (
          <p role="status" className="rounded-lg border border-seam bg-raised px-4 py-3">
            {result}{" "}
            {outlet && (
              <Link href={`/kitchen?outlet=${outlet.slug}`} className="underline underline-offset-4">
                Open the {outlet.name} kitchen
              </Link>
            )}
          </p>
        )}
      </section>
    </main>
  );
}

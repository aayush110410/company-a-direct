"use client";

import { ArrowRight } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { signInAsDemo } from "@/app/(auth)/actions";
import type { DemoKey } from "@/lib/demo-accounts";
import { cn } from "@/lib/cn";

const ROLES: { key: DemoKey; title: string; what: string }[] = [
  { key: "customer", title: "Customer", what: "Order, pay and track live" },
  { key: "kitchen", title: "Kitchen · Kondapur", what: "Run the kitchen screen" },
  { key: "manager", title: "Manager · Kondapur", what: "Late alerts and time overrides" },
  { key: "kitchenGachibowli", title: "Kitchen · Gachibowli", what: "A second outlet's board" },
  { key: "admin", title: "Menu admin", what: "Edit the central menu" },
];

export function DemoAccounts({ next }: { next?: string }) {
  const [pending, start] = useTransition();
  return (
    <section aria-labelledby="demo-heading" className="mt-10 border-t border-seam pt-8">
      <h2 id="demo-heading" className="section-title">
        Reviewing? Try a demo account
      </h2>
      <ul className="mt-3 flex flex-col">
        {ROLES.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await signInAsDemo(r.key, next);
                  if (result && !result.ok) toast.error(result.error);
                })
              }
              className={cn(
                "group flex min-h-14 w-full items-center justify-between gap-4 border-b border-seam py-3 text-left transition-colors",
                "hover:text-accent-strong disabled:opacity-50",
              )}
            >
              <span>
                <span className="block font-semibold">{r.title}</span>
                <span className="block text-sm text-muted">{r.what}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent-strong" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

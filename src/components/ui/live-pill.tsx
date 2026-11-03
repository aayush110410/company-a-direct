import { cn } from "@/lib/cn";

const LABEL = { live: "Live", reconnecting: "Reconnecting…", offline: "Offline" } as const;

export function LivePill({ state, className }: { state: keyof typeof LABEL; className?: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        state === "live" ? "border-seam text-fg" : state === "reconnecting" ? "border-risk/60 text-[var(--risk-text)]" : "border-late/70 text-[var(--late-text)]",
        className,
      )}
    >
      <span className="relative flex size-2">
        <span className={cn("relative size-2 rounded-full", state === "live" ? "bg-fg" : state === "reconnecting" ? "bg-risk" : "bg-late")} />
      </span>
      {LABEL[state]}
    </span>
  );
}

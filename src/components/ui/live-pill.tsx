import { cn } from "@/lib/cn";

const LABEL = { live: "Live", reconnecting: "Reconnecting…", offline: "Offline" } as const;

export function LivePill({ state, className }: { state: keyof typeof LABEL; className?: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        state === "live" ? "border-ok/50 text-[#7cc394]" : state === "reconnecting" ? "border-risk/60 text-risk" : "border-late/70 text-[#e0705f]",
        className,
      )}
    >
      <span className="relative flex size-2">
        {state === "live" && <span className="absolute inset-0 rounded-full bg-ok opacity-60 motion-safe:animate-ping" />}
        <span className={cn("relative size-2 rounded-full", state === "live" ? "bg-ok" : state === "reconnecting" ? "bg-risk" : "bg-late")} />
      </span>
      {LABEL[state]}
    </span>
  );
}

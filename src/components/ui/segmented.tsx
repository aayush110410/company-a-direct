"use client";

import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; detail?: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-seam bg-surface p-1", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150",
              selected ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {o.label}
            {o.detail && <span className={cn("text-xs font-medium tabular-nums", selected ? "text-bg/70" : "text-muted")}>{o.detail}</span>}
          </button>
        );
      })}
    </div>
  );
}

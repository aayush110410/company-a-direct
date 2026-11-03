"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function Stepper({
  value,
  min = 0,
  max = 20,
  onChange,
  label,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label: string;
  className?: string;
}) {
  const btn =
    "grid size-11 place-items-center rounded-lg text-fg transition-colors duration-150 hover:bg-raised disabled:opacity-35 disabled:hover:bg-transparent";
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center rounded-xl border border-seam", className)}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-8 text-center font-semibold tabular-nums">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

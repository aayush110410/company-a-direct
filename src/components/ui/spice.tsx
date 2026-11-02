import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";

const NAMES = ["Not spicy", "Mild", "Medium", "Hot"] as const;

export function SpiceLevel({ level, className }: { level: 0 | 1 | 2 | 3; className?: string }) {
  if (level === 0) return null;
  return (
    <span role="img" aria-label={`Spice: ${NAMES[level]}`} className={cn("inline-flex items-center gap-px text-[#d0703a]", className)}>
      {Array.from({ length: level }, (_, i) => (
        <Flame key={i} className="size-3.5" strokeWidth={2.25} aria-hidden />
      ))}
    </span>
  );
}

export function spiceName(level: 0 | 1 | 2 | 3) {
  return NAMES[level];
}

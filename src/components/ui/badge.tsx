import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "risk" | "late" | "ok";

const tones: Record<Tone, string> = {
  neutral: "border-seam text-muted",
  accent: "border-accent/50 text-accent-strong",
  risk: "border-risk/60 text-risk",
  late: "border-late/70 text-[#e0705f]",
  ok: "border-ok/60 text-[#7cc394]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

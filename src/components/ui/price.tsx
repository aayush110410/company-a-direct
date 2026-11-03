import { formatINR } from "@/domain/money";
import { cn } from "@/lib/cn";

export function Price({ paise, className }: { paise: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatINR(paise)}</span>;
}

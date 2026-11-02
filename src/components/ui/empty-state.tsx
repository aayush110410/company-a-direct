import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 py-10", className)}>
      <h2 className="font-display text-2xl leading-tight">{title}</h2>
      <div className="max-w-[46ch] text-muted">{body}</div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

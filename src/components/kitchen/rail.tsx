import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The steel rail tickets hang from: on the pass in the kitchen, and on the customer's status page.
 * A flat bar, never faux metal; tickets meet it through their clip.
 */
export function Rail({ children, caption, className }: { children: ReactNode; caption?: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="h-2.5 rounded-full bg-[#3d3a34] shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]" />
      {caption && <p className="mt-2 text-sm text-muted">{caption}</p>}
      <div className={cn("flex flex-col gap-5", caption ? "pt-3" : "pt-0")}>{children}</div>
    </div>
  );
}

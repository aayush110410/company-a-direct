import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,var(--surface)_0%,var(--raised)_50%,var(--surface)_100%)] bg-[length:200%_100%] motion-safe:animate-shimmer",
        className,
      )}
    />
  );
}

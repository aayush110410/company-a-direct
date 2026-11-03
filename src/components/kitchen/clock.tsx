"use client";

import { formatIstTime } from "@/domain/time";
import { useNow } from "./use-now";

export function KitchenClock() {
  const now = useNow(10_000);
  return (
    <time suppressHydrationWarning className="text-[1.75rem] font-semibold tabular-nums" dateTime={now.toISOString()}>
      {formatIstTime(now)}
    </time>
  );
}

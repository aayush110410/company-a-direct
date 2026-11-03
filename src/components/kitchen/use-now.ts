"use client";

import { useEffect, useState } from "react";

/** A clock that ticks every `ms` so timers and urgency colours stay current. */
export function useNow(ms = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

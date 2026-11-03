"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import { chime } from "@/lib/kitchen/chime";

const KEY = "kitchen:shift-started";
const noop = () => () => {};
const readStarted = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * One tap at the start of a shift: unlocks the chime (browsers block sound until a tap),
 * keeps the tablet awake and goes full screen where the device allows it.
 */
export function ShiftStartOverlay({ outletName }: { outletName: string }) {
  const startedThisTab = useSyncExternalStore(noop, readStarted, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (startedThisTab || dismissed) return null;

  const start = async () => {
    chime.unlock();
    chime.play();
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    try {
      await (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<unknown> } }).wakeLock?.request("screen");
    } catch {}
    try {
      if (window.matchMedia("(pointer: coarse)").matches) await document.documentElement.requestFullscreen?.();
    } catch {}
    setDismissed(true);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="shift-title" className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h2 id="shift-title" className="font-display text-5xl">
          {outletName}
        </h2>
        <p className="text-muted">Tap to start the shift. New tickets will chime, and the screen will stay on.</p>
        <Button size="xl" onClick={start} className="w-full">
          Start shift
        </Button>
      </div>
    </div>
  );
}

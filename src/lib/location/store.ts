"use client";

import { useSyncExternalStore } from "react";

/** Where the customer wants delivery: a picked area or their device location. */
export type DeliveryLocation = { lat: number; lng: number; label: string; areaSlug: string | null };

const KEY = "location:v1";
const SERVER: { hydrated: false; location: null } = { hydrated: false, location: null };
let snap: { hydrated: boolean; location: DeliveryLocation | null } | undefined;
const listeners = new Set<() => void>();

function read(): DeliveryLocation | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DeliveryLocation) : null;
  } catch {
    return null;
  }
}

const getSnapshot = () => (snap ??= { hydrated: true, location: read() });

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function setDeliveryLocation(location: DeliveryLocation | null) {
  snap = { hydrated: true, location };
  try {
    if (location) window.localStorage.setItem(KEY, JSON.stringify(location));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: keep it for this tab only.
  }
  for (const l of listeners) l();
}

export function useDeliveryLocation() {
  const { hydrated, location } = useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
  return { hydrated, location, set: setDeliveryLocation };
}

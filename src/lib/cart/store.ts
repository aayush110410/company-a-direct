"use client";

import { useSyncExternalStore } from "react";
import type { CartLine } from "@/domain/pricing";
import { MAX_QTY } from "@/domain/pricing";

/**
 * The cart lives in the browser, one outlet at a time (prices and stock differ by outlet and city).
 * Totals here are for display; the server re-prices every order.
 */
export type CartItem = CartLine & {
  key: string;
  name: string;
  portionName: string;
  unitPaise: number;
  addonNames: string[];
  diet: string;
};

export type Cart = { outletId: string; outletSlug: string; outletName: string; lines: CartItem[] };
export type CartOutlet = { id: string; slug: string; name: string };

type Action =
  | { type: "add"; item: Omit<CartItem, "key">; outlet: CartOutlet }
  | { type: "setQty"; key: string; qty: number }
  | { type: "remove"; key: string }
  | { type: "switchOutlet"; outlet: CartOutlet }
  | { type: "clear" };

export const lineKey = (l: Pick<CartLine, "portionId" | "addonIds">) => `${l.portionId}|${[...l.addonIds].sort().join(",")}`;

const emptyCart = (o: CartOutlet): Cart => ({ outletId: o.id, outletSlug: o.slug, outletName: o.name, lines: [] });

export function cartReducer(cart: Cart | null, action: Action): { cart: Cart | null; result?: "added" | "needs_switch" } {
  switch (action.type) {
    case "add": {
      if (cart && cart.lines.length > 0 && cart.outletId !== action.outlet.id) return { cart, result: "needs_switch" };
      const base = cart && cart.outletId === action.outlet.id ? cart : emptyCart(action.outlet);
      const key = lineKey(action.item);
      const existing = base.lines.find((l) => l.key === key);
      const lines = existing
        ? base.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + action.item.qty) } : l))
        : [...base.lines, { ...action.item, key, qty: Math.min(MAX_QTY, action.item.qty) }];
      return { cart: { ...base, lines }, result: "added" };
    }
    case "setQty": {
      if (!cart) return { cart };
      const qty = Math.min(MAX_QTY, Math.max(0, Math.floor(action.qty)));
      const lines =
        qty === 0 ? cart.lines.filter((l) => l.key !== action.key) : cart.lines.map((l) => (l.key === action.key ? { ...l, qty } : l));
      return { cart: { ...cart, lines } };
    }
    case "remove":
      return { cart: cart ? { ...cart, lines: cart.lines.filter((l) => l.key !== action.key) } : cart };
    case "switchOutlet":
      return { cart: emptyCart(action.outlet) };
    case "clear":
      return { cart: null };
  }
}

export function cartTotals(cart: Cart | null): { count: number; subtotalPaise: number } {
  const lines = cart?.lines ?? [];
  return {
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotalPaise: lines.reduce((s, l) => s + l.qty * l.unitPaise, 0),
  };
}

// ---- Browser store ---------------------------------------------------------

const STORAGE_KEY = "cart:v1";
const SERVER_SNAPSHOT: { hydrated: false; cart: null } = { hydrated: false, cart: null };
let snapshot: { hydrated: boolean; cart: Cart | null } | undefined;
const listeners = new Set<() => void>();

function read(): Cart | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Cart) : null;
  } catch {
    return null;
  }
}

function getSnapshot() {
  snapshot ??= { hydrated: true, cart: read() };
  return snapshot;
}

function write(cart: Cart | null) {
  snapshot = { hydrated: true, cart };
  try {
    if (cart) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or full storage: the cart still works for this tab.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = { hydrated: true, cart: read() };
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function dispatch(action: Action) {
  const next = cartReducer(getSnapshot().cart, action);
  if (next.cart !== getSnapshot().cart) write(next.cart);
  return next.result;
}

export function useCart() {
  const { hydrated, cart } = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  return {
    hydrated,
    cart,
    ...cartTotals(cart),
    add: (item: Omit<CartItem, "key">, outlet: CartOutlet) => dispatch({ type: "add", item, outlet }) ?? "added",
    switchOutlet: (outlet: CartOutlet) => dispatch({ type: "switchOutlet", outlet }),
    setQty: (key: string, qty: number) => dispatch({ type: "setQty", key, qty }),
    remove: (key: string) => dispatch({ type: "remove", key }),
    clear: () => dispatch({ type: "clear" }),
  };
}

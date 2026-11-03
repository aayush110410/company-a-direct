"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getBoardAction, getBoardOrderAction } from "@/app/kitchen/actions";
import { createBrowserClient } from "@/server/supabase/browser";
import { type BoardOrder, boardReducer, type KitchenAlert } from "./board-reducer";
import { type ConnectionState, subscribeTable } from "./channel";

const RESYNC_MS = 20_000;

/**
 * The kitchen rail, kept live. Realtime pushes changes; a full snapshot is re-read on subscribe,
 * on reconnect, when the tab comes back to the front, and every 20 s — so a tablet that slept
 * through a rush still ends up showing every order.
 */
export function useLiveBoard(
  outletId: string,
  initial: { orders: BoardOrder[]; alerts: KitchenAlert[] },
  opts: { demo?: boolean } = {},
) {
  const [orders, dispatch] = useReducer(boardReducer, initial.orders, (o) => boardReducer({}, { type: "snapshot", orders: o }));
  const [alerts, setAlerts] = useState(initial.alerts);
  const [connection, setConnection] = useState<ConnectionState>("reconnecting");
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const known = useRef(new Set(initial.orders.map((o) => o.id)));

  const markNew = useCallback((ids: string[]) => {
    const fresh = ids.filter((id) => !known.current.has(id));
    for (const id of ids) known.current.add(id);
    if (fresh.length) setNewOrderIds((s) => new Set([...s, ...fresh]));
  }, []);

  const snapshot = useCallback(async () => {
    const r = await getBoardAction(outletId);
    if (!r.ok) return false;
    dispatch({ type: "snapshot", orders: r.data.orders });
    setAlerts(r.data.alerts);
    markNew(r.data.orders.filter((o) => o.status === "placed").map((o) => o.id));
    return true;
  }, [outletId, markNew]);

  const disconnectRef = useRef<() => void>(() => {});
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const client = createBrowserClient();
    const stopOrders = subscribeTable<{ id: string; status: string }>(client, {
      channel: `kitchen-orders:${outletId}`,
      table: "orders",
      filter: `outlet_id=eq.${outletId}`,
      onChange: async ({ new: row, old }) => {
        const id = row?.id ?? (old?.id as string | undefined);
        if (!id) return;
        const r = await getBoardOrderAction(id);
        if (!r.ok) return;
        if (r.data) {
          dispatch({ type: "upsert", order: r.data });
          if (r.data.status === "placed") markNew([r.data.id]);
        } else dispatch({ type: "remove", id });
      },
      onStatus: async (state, subscribed) => {
        if (subscribed) {
          // "Live" only once the snapshot after subscribing has landed.
          if (await snapshot()) setConnection("live");
        } else setConnection(state);
      },
    });
    const stopAlerts = subscribeTable(client, {
      channel: `kitchen-alerts:${outletId}`,
      table: "alerts",
      filter: `outlet_id=eq.${outletId}`,
      onChange: () => void snapshot(),
      onStatus: () => {},
    });
    disconnectRef.current = () => {
      stopOrders();
      stopAlerts();
      setConnection("reconnecting");
    };

    const resync = () => void snapshot();
    const onVisible = () => document.visibilityState === "visible" && resync();
    const onOffline = () => setConnection("offline");
    window.addEventListener("online", resync);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(resync, RESYNC_MS);

    return () => {
      stopOrders();
      stopAlerts();
      window.removeEventListener("online", resync);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [outletId, snapshot, markNew, epoch]);

  // Demo/test hook: drop and restore the socket on purpose to show the board resyncs.
  useEffect(() => {
    if (!opts.demo) return;
    (window as unknown as { __kds?: object }).__kds = {
      disconnect: () => disconnectRef.current(),
      reconnect: () => setEpoch((e) => e + 1),
    };
  }, [opts.demo]);

  const consumeNew = useCallback((id: string) => setNewOrderIds((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : s)), []);

  return { orders: Object.values(orders), alerts, connection, newOrderIds, consumeNew, refresh: snapshot };
}

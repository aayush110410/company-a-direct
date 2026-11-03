"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrderViewAction } from "@/app/(customer)/actions";
import type { OrderView } from "@/server/orders/order-view";
import { createBrowserClient } from "@/server/supabase/browser";
import { type ConnectionState, subscribeTable } from "./channel";

/** The customer's own order, live: Realtime for speed, refetch on reconnect, focus and every 20 s. */
export function useLiveOrder(orderId: string, initial: OrderView) {
  const [order, setOrder] = useState(initial);
  const [connection, setConnection] = useState<ConnectionState>("reconnecting");

  const refresh = useCallback(async () => {
    const r = await getOrderViewAction(orderId);
    if (r.ok) setOrder(r.data);
  }, [orderId]);

  useEffect(() => {
    const stop = subscribeTable(createBrowserClient(), {
      channel: `order:${orderId}`,
      table: "orders",
      filter: `id=eq.${orderId}`,
      onChange: () => void refresh(),
      onStatus: (state, subscribed) => {
        setConnection(subscribed ? "live" : state);
        if (subscribed) void refresh();
      },
    });
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    const t = setInterval(refresh, 20_000);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      clearInterval(t);
    };
  }, [orderId, refresh]);

  return { order, connection };
}

"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type ConnectionState = "live" | "reconnecting" | "offline";

export type ChangePayload<Row> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Row | null;
  old: Partial<Row> | null;
};

/**
 * Subscribes to row changes on one table, filtered (and RLS-checked) server-side.
 * The JWT is attached before subscribing, and a dropped channel resubscribes with backoff.
 * Callers still refetch on reconnect: Realtime speeds the screen up, it is not the source of truth.
 */
let instance = 0;

export function subscribeTable<Row>(
  client: SupabaseClient,
  opts: {
    channel: string;
    table: "orders" | "alerts" | "outlet_item_availability";
    filter: string;
    onChange: (payload: ChangePayload<Row>) => void;
    onStatus: (state: ConnectionState, subscribed: boolean) => void;
  },
): () => void {
  // Every subscription gets its own topic: React may mount an effect twice, and a topic can be subscribed only once.
  const topic = `${opts.channel}:${++instance}`;
  let channel: RealtimeChannel | null = null;
  let stopped = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const connect = async () => {
    if (stopped) return;
    const { data } = await client.auth.getSession();
    await client.realtime.setAuth(data.session?.access_token ?? null);

    channel = client
      .channel(`${topic}:${attempt}`)
      .on("postgres_changes", { event: "*", schema: "public", table: opts.table, filter: opts.filter }, (p) =>
        opts.onChange({ eventType: p.eventType, new: (p.new as Row) ?? null, old: (p.old as Partial<Row>) ?? null }),
      )
      .subscribe((status) => {
        if (stopped) return;
        if (status === "SUBSCRIBED") {
          attempt = 0;
          opts.onStatus("live", true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          opts.onStatus(navigator.onLine ? "reconnecting" : "offline", false);
          scheduleReconnect();
        }
      });
  };

  const scheduleReconnect = () => {
    if (stopped || retry) return;
    const delay = Math.min(30_000, 1_000 * 2 ** attempt++);
    retry = setTimeout(async () => {
      retry = undefined;
      if (channel) await client.removeChannel(channel);
      void connect();
    }, delay);
  };

  void connect();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    if (channel) void client.removeChannel(channel);
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeTable } from "./channel";

/** A stand-in for the Supabase client that behaves like realtime-js: removing a channel fires its CLOSED callback. */
function fakeClient() {
  const channels: { name: string; status?: (s: string) => void; removed: boolean }[] = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) },
    realtime: { setAuth: async () => {} },
    channel(name: string) {
      const ch = { name, status: undefined as ((s: string) => void) | undefined, removed: false };
      channels.push(ch);
      const api = {
        on: () => api,
        subscribe: (cb: (s: string) => void) => {
          ch.status = cb;
          return api;
        },
        __ch: ch,
      };
      return api;
    },
    async removeChannel(api: { __ch: (typeof channels)[number] }) {
      api.__ch.removed = true;
      api.__ch.status?.("CLOSED");
    },
  };
  return { client, channels };
}

describe("subscribeTable reconnects", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("replaces a dropped channel once, without looping", async () => {
    const { client, channels } = fakeClient();
    const states: string[] = [];
    const stop = subscribeTable(client as never, {
      channel: "t",
      table: "orders",
      filter: "outlet_id=eq.1",
      onChange: () => {},
      onStatus: (s) => states.push(s),
    });
    await vi.advanceTimersByTimeAsync(0);
    channels[0]!.status!("SUBSCRIBED");

    channels[0]!.status!("CHANNEL_ERROR"); // the connection drops
    await vi.advanceTimersByTimeAsync(1_000);
    expect(channels).toHaveLength(2);
    channels[1]!.status!("SUBSCRIBED");

    // Nothing else is wrong, so no further channels should be created.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(channels).toHaveLength(2);
    expect(channels[1]!.removed).toBe(false);
    expect(states.at(-1)).toBe("live");
    stop();
  });
});

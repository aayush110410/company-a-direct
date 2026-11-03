import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import type { Database } from "../db-types";
import { loadActiveModel } from "../model-store";
import { buildPaidOrder } from "./build-order";
import { type CatalogLine, loadDemoCatalog } from "./catalog";
import { insertPaidOrder } from "./insert-paid-order";

const MIN = 60_000;

export async function findUserIdByEmail(client: SupabaseClient<Database>, email: string): Promise<string | null> {
  const { data, error } = await client.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`list users: ${error.message}`);
  return data.users.find((u) => u.email === email)?.id ?? null;
}

/**
 * Clears all orders and messages, then re-creates the brief's three sample orders re-based to
 * `now` (assumption A12) plus a realistic Kondapur dinner service on the kitchen board.
 */
export async function resetDemoData(client: SupabaseClient<Database>, now: Date): Promise<string[]> {
  for (const table of ["outbox_messages", "orders"] as const) {
    const { error } = await client.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`clear ${table}: ${error.message}`);
  }

  const customerId = await findUserIdByEmail(client, DEMO_ACCOUNTS.customer.email);
  if (!customerId) throw new Error("demo customer missing — run the full seed first");
  const model = await loadActiveModel(client);
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MIN);

  const kondapur = await loadDemoCatalog(client, { slug: "kondapur" });
  const gachibowli = await loadDemoCatalog(client, { slug: "gachibowli-cloud-kitchen" });
  const kukatpally = await loadDemoCatalog(client, { slug: "kukatpally" });
  const pick = (lines: CatalogLine[], slug: string, portion: string, qty: number) => {
    const line = lines.find((l) => l.itemSlug === slug && l.portionName === portion);
    if (!line) throw new Error(`menu line missing: ${slug} ${portion}`);
    return { line, qty };
  };

  const ids: string[] = [];
  const add = async (row: Parameters<typeof insertPaidOrder>[1]) => ids.push(await insertPaidOrder(client, row));

  // The brief's sample orders. Promise gaps (45/40/50 min) and statuses are kept from the brief.
  await add(
    buildPaidOrder({
      id: "WEB-778120",
      outlet: kondapur.outlet,
      customerId,
      model,
      openOrders: [],
      placedAt: at(11),
      status: "preparing",
      paymentMethod: "upi",
      promiseMinutesOverride: 45,
      stageTimes: { preparingAt: at(6) },
      picks: [pick(kondapur.lines, "chicken-dum-biryani", "Family pack", 1), pick(kondapur.lines, "double-ka-meetha", "Single", 2)],
    }),
  );
  await add(
    buildPaidOrder({
      id: "WEB-778131",
      outlet: gachibowli.outlet,
      customerId,
      model,
      openOrders: [],
      placedAt: at(30),
      status: "ready",
      paymentMethod: "card",
      promiseMinutesOverride: 40,
      stageTimes: { preparingAt: at(25), readyAt: at(3) },
      picks: [pick(gachibowli.lines, "veg-biryani", "Single", 2), pick(gachibowli.lines, "mirchi-ka-salan", "Single", 1)],
    }),
  );
  await add(
    buildPaidOrder({
      id: "WEB-778146",
      outlet: kukatpally.outlet,
      customerId,
      model,
      openOrders: [],
      placedAt: at(54),
      status: "preparing",
      paymentMethod: "upi",
      promiseMinutesOverride: 50, // promised 4 minutes ago → "Late by 4 minutes"; the alert fires 6 minutes later
      stageTimes: { preparingAt: at(40) },
      picks: [pick(kukatpally.lines, "mutton-haleem", "Single", 3)],
    }),
  );

  // A Kondapur dinner service so the kitchen board is busy when the reviewer opens it.
  const service = [
    { minutesAgo: 26, status: "handed_to_rider" as const, picks: [["mutton-dum-biryani", "Family pack", 1]], stages: { preparingAt: 22, readyAt: 8, handedAt: 4 } },
    { minutesAgo: 20, status: "ready" as const, picks: [["paneer-65", "Single", 1], ["veg-biryani", "Single", 1]], stages: { preparingAt: 17, readyAt: 2 } },
    { minutesAgo: 15, status: "preparing" as const, picks: [["egg-biryani", "Single", 2], ["phirni", "Single", 2]], stages: { preparingAt: 12 } },
    { minutesAgo: 8, status: "preparing" as const, picks: [["mutton-dum-biryani", "Single", 1], ["chicken-65", "Single", 1]], stages: { preparingAt: 5 } },
    { minutesAgo: 2, status: "placed" as const, picks: [["chicken-dum-biryani", "Single", 2], ["mirchi-ka-salan", "Single", 1]], stages: {} },
    { minutesAgo: 1, status: "placed" as const, picks: [["veg-biryani", "Family pack", 1], ["dahi-chutney", "Single", 2]], stages: {} },
  ];
  const open: { status: "placed" | "preparing" }[] = [{ status: "preparing" }]; // WEB-778120
  for (const s of service) {
    await add(
      buildPaidOrder({
        outlet: kondapur.outlet,
        customerId,
        model,
        openOrders: [...open],
        placedAt: at(s.minutesAgo),
        status: s.status,
        paymentMethod: s.minutesAgo % 2 ? "card" : "upi",
        distanceKm: 1.5 + (s.minutesAgo % 4),
        stageTimes: Object.fromEntries(Object.entries(s.stages).map(([k, v]) => [k, at(v)])),
        picks: s.picks.map(([slug, portion, qty]) => pick(kondapur.lines, slug as string, portion as string, qty as number)),
      }),
    );
    if (s.status === "placed" || s.status === "preparing") open.push({ status: s.status });
  }
  return ids;
}

/**
 * Drops one paid order onto an outlet's kitchen board, through the real estimate path.
 * Usage: pnpm dev-order kondapur
 */
import { mulberry32 } from "@/domain/prep/random";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { buildPaidOrder } from "@/server/demo/build-order";
import { loadDemoCatalog } from "@/server/demo/catalog";
import { insertPaidOrder } from "@/server/demo/insert-paid-order";
import { findUserIdByEmail } from "@/server/demo/reset";
import { loadActiveModel } from "@/server/model-store";
import { adminClientForScripts } from "./lib/admin-client";

const db = adminClientForScripts();

async function main() {
  const slug = process.argv[2] ?? "kondapur";
  const { outlet, lines } = await loadDemoCatalog(db, { slug });
  const customerId = await findUserIdByEmail(db, DEMO_ACCOUNTS.customer.email);
  if (!customerId) throw new Error("run pnpm seed first");
  const { data: open } = await db.from("orders").select("status").eq("outlet_id", outlet.id).in("status", ["placed", "preparing"]);

  const rand = mulberry32(Date.now() % 2 ** 31);
  const picks = Array.from({ length: 1 + Math.floor(rand() * 2) }, () => ({ line: lines[Math.floor(rand() * lines.length)]!, qty: 1 + Math.floor(rand() * 2) }));
  const row = buildPaidOrder({
    outlet,
    customerId,
    picks,
    openOrders: (open ?? []) as { status: "placed" | "preparing" }[],
    model: await loadActiveModel(db),
    placedAt: new Date(),
    status: "placed",
    paymentMethod: "upi",
  });
  const id = await insertPaidOrder(db, row);
  console.log(`${id} → ${slug}: ${picks.map((p) => `${p.qty}× ${p.line.name} (${p.line.portionName})`).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

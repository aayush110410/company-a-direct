import { adminClientForScripts } from "../scripts/lib/admin-client";
import { buildPaidOrder } from "../src/server/demo/build-order";
import { loadDemoCatalog } from "../src/server/demo/catalog";
import { insertPaidOrder } from "../src/server/demo/insert-paid-order";
import { findUserIdByEmail } from "../src/server/demo/reset";
import { expect, openKitchen, signedInPage, test } from "./fixtures";

async function dropOrderAtKondapur() {
  const db = adminClientForScripts();
  const { outlet, lines } = await loadDemoCatalog(db, { slug: "kondapur" });
  const customerId = (await findUserIdByEmail(db, "customer@example.com"))!;
  return insertPaidOrder(
    db,
    buildPaidOrder({ outlet, customerId, picks: [{ line: lines[0]!, qty: 1 }], openOrders: [], model: null, placedAt: new Date(), status: "placed", paymentMethod: "upi" }),
  );
}

test("the kitchen board recovers orders placed while it was disconnected", async ({ browser }) => {
  const { page, context, check } = await signedInPage(browser, "Kitchen · Kondapur", "/kitchen");
  await openKitchen(page);

  await page.evaluate(() => (window as unknown as { __kds: { disconnect(): void } }).__kds.disconnect());
  await expect(page.getByRole("status").filter({ hasText: "Reconnecting" })).toBeVisible();

  const orderId = await dropOrderAtKondapur();
  await expect(page.getByRole("article", { name: new RegExp(`Order ${orderId}`) })).toHaveCount(0);

  await page.evaluate(() => (window as unknown as { __kds: { reconnect(): void } }).__kds.reconnect());
  await expect(page.getByRole("article", { name: new RegExp(`Order ${orderId}`) })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole("status").filter({ hasText: "Live" })).toBeVisible();
  await check();
  await context.close();
});

test("a tablet that went offline catches up when it comes back", async ({ browser }) => {
  const { page, context, check } = await signedInPage(browser, "Kitchen · Kondapur", "/kitchen");
  await openKitchen(page);
  await context.setOffline(true);
  const orderId = await dropOrderAtKondapur();
  await context.setOffline(false);
  await expect(page.getByRole("article", { name: new RegExp(`Order ${orderId}`) })).toBeVisible({ timeout: 25_000 });
  await check();
  await context.close();
});

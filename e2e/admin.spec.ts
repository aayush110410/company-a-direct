import { expect, openKitchen, signedInPage, test } from "./fixtures";

test("a simulated dinner rush fills the kitchen board live", async ({ browser }) => {
  const kitchen = await signedInPage(browser, "Kitchen · Kondapur", "/kitchen");
  await openKitchen(kitchen.page);
  const before = await kitchen.page.getByRole("article").count();

  const admin = await signedInPage(browser, "Menu admin", "/admin/demo");
  await admin.page.goto("/admin/demo");
  await admin.page.getByLabel("Orders").fill("5");
  await admin.page.getByRole("button", { name: "Send the rush" }).click();
  await expect(admin.page.getByRole("status")).toContainText("5 orders sent");

  await expect.poll(() => kitchen.page.getByRole("article").count(), { timeout: 15_000 }).toBe(before + 5);
  await admin.check();
  await kitchen.check();
  await admin.context.close();
  await kitchen.context.close();
});

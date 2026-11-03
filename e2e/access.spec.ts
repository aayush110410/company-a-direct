import { expect, openKitchen, signedInPage, test } from "./fixtures";

test("customers can't open the kitchen screen", async ({ browser }) => {
  const { page, context } = await signedInPage(browser, "Customer");
  await page.goto("/kitchen");
  await expect(page).toHaveURL("http://localhost:3000/");
  await context.close();
});

test("a kitchen only sees its own outlet's orders", async ({ browser }) => {
  const { page, context } = await signedInPage(browser, "Kitchen · Gachibowli", "/kitchen");
  await openKitchen(page);
  await expect(page.getByRole("heading", { name: "Gachibowli cloud kitchen" })).toBeVisible();
  await expect(page.getByRole("article", { name: /WEB-778131/ })).toBeVisible();
  await expect(page.getByRole("article", { name: /WEB-778120/ })).toHaveCount(0); // a Kondapur order
  await context.close();
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/admin/menu");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin%2Fmenu/);
});

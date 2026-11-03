import { chooseArea, expect, openKitchen, signedInPage, test } from "./fixtures";

test.describe("ordering direct", () => {
  test("a paid order lands on the kitchen rail live, and the customer sees it move", async ({ browser }) => {
    const kitchen = await signedInPage(browser, "Kitchen · Kondapur", "/kitchen");
    await openKitchen(kitchen.page);

    const customer = await signedInPage(browser, "Customer");
    const page = customer.page;
    const started = Date.now();

    await chooseArea(page, "Kondapur");
    await page.getByRole("link", { name: "See the menu" }).click();
    await page.getByRole("button", { name: /^Chicken dum biryani, from/ }).click();
    await page.getByRole("radio", { name: "Family pack" }).click();
    await page.getByRole("button", { name: /^Add/ }).click();
    await page.getByRole("link", { name: /View cart/ }).click();

    await page.getByRole("textbox", { name: "Address" }).fill("Flat 302, Sai Residency, Kondapur Main Road");
    await page.getByRole("textbox", { name: "Mobile number" }).fill("9876543210");
    await page.getByPlaceholder("Coupon code").fill("direct10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Discount (DIRECT10)")).toBeVisible();
    await expect(page.getByText(/Includes ₹\d+ GST \(5%\)/)).toBeVisible();

    await page.getByRole("button", { name: /^Pay ₹882$/ }).click();
    await page.waitForURL(/\/pay\/WEB-\d+/);
    const orderId = page.url().match(/WEB-\d+/)![0];
    await page.getByRole("button", { name: /^Pay ₹882$/ }).click();
    await page.waitForURL(new RegExp(`/orders/${orderId}`));
    expect(Date.now() - started, "checkout under a minute").toBeLessThan(60_000);
    await expect(page.getByRole("heading", { name: /Arrives by/ })).toBeVisible();

    // The kitchen board shows it without a reload.
    const ticket = kitchen.page.getByRole("article", { name: new RegExp(`Order ${orderId}`) });
    await expect(ticket).toBeVisible({ timeout: 10_000 });
    await ticket.getByRole("button", { name: "Start" }).click();

    // The customer's page follows without a reload.
    await expect(page.getByRole("listitem").filter({ hasText: "Cooking" }).getByText(/\d+:\d\d (am|pm)/)).toBeVisible({ timeout: 10_000 });

    // From anywhere on the site, the header leads back to the live order.
    await page.goto("/");
    await page.getByRole("link", { name: "Track order" }).click();
    await page.waitForURL(new RegExp(`/orders/${orderId}`));

    await customer.check();
    await kitchen.check();
    await customer.context.close();
    await kitchen.context.close();
  });

  test("a failed payment can be retried", async ({ browser }) => {
    const { page, context, check } = await signedInPage(browser, "Customer");
    await chooseArea(page, "Kondapur");
    await page.getByRole("link", { name: "See the menu" }).click();
    await page.getByRole("button", { name: /^Veg biryani, from/ }).click();
    await page.getByRole("button", { name: /^Add/ }).click();
    await page.goto("/checkout");
    await page.getByRole("textbox", { name: "Address" }).fill("Flat 302, Sai Residency, Kondapur Main Road");
    await page.getByRole("textbox", { name: "Mobile number" }).fill("9876543210");
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.waitForURL(/\/pay\//);

    // An unpaid order has no status page yet: its link leads back to paying.
    const payUrl = page.url();
    await page.goto(payUrl.replace("/pay/", "/orders/"));
    await page.waitForURL(payUrl);

    await page.getByRole("button", { name: "A failed payment" }).click();
    await expect(page.getByText(/No money was taken/)).toBeVisible();
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.waitForURL(/\/orders\/WEB-\d+/);
    await check();
    await context.close();
  });

  test("an area no kitchen reaches says so", async ({ browser }) => {
    const { page, context, check } = await signedInPage(browser, "Customer");
    await chooseArea(page, "Shamshabad");
    await expect(page.getByText("We don’t deliver to Shamshabad yet")).toBeVisible();
    await check();
    await context.close();
  });
});

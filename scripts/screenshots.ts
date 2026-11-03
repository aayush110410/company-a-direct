/**
 * Captures the key screens at phone and desktop sizes for design review and the TDD.
 * Needs the app running on :3000 with seeded data. Run: pnpm tsx scripts/screenshots.ts [outDir]
 */
import { mkdirSync } from "node:fs";
import { type Browser, chromium, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const out = process.argv[2] ?? "docs/screenshots";
mkdirSync(out, { recursive: true });

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

async function session(browser: Browser, label: string | null, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  if (label) {
    await page.goto(`${BASE}/sign-in`);
    await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
  }
  return { context, page };
}

async function shot(page: Page, name: string, full = false) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  console.log(`saved ${name}`);
}

async function main() {
  const browser = await chromium.launch();

  for (const [suffix, viewport] of [["mobile", PHONE], ["desktop", DESKTOP]] as const) {
    const { context, page } = await session(browser, "Customer", viewport);
    await page.goto(BASE);
    await page.getByRole("combobox").selectOption({ label: "Kondapur" });
    await shot(page, `01-home-${suffix}`);
    await page.goto(`${BASE}/o/kondapur`);
    await shot(page, `02-menu-${suffix}`);
    await page.getByRole("button", { name: /^Chicken dum biryani, from/ }).click();
    await page.getByRole("radio", { name: "Family pack" }).click();
    await shot(page, `03-item-sheet-${suffix}`);
    await page.getByRole("button", { name: /^Add/ }).click();
    await page.goto(`${BASE}/checkout`);
    await page.getByRole("textbox", { name: "Address" }).fill("Flat 302, Sai Residency, Kondapur Main Road");
    await page.getByPlaceholder("Coupon code").fill("DIRECT10");
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByText("Discount (DIRECT10)").waitFor();
    await shot(page, `04-checkout-${suffix}`, true);
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.waitForURL(/\/pay\//);
    await shot(page, `05-pay-${suffix}`);
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.waitForURL(/\/orders\//);
    await shot(page, `06-status-${suffix}`, suffix === "mobile");
    await context.close();
  }

  {
    const { context, page } = await session(browser, "Manager · Kondapur", { width: 1280, height: 800 });
    await page.goto(`${BASE}/kitchen`);
    await page.getByRole("button", { name: "Start shift" }).click();
    await shot(page, "07-kitchen-tablet");
    await context.close();
  }
  {
    const { context, page } = await session(browser, "Menu admin", DESKTOP);
    await page.goto(`${BASE}/admin/menu`);
    await shot(page, "08-admin-menu");
    await page.getByRole("link", { name: /Chicken dum biryani/ }).first().click();
    await page.waitForURL(/\/admin\/menu\/.+/);
    await shot(page, "09-admin-editor", true);
    await page.goto(`${BASE}/admin/outbox`);
    await shot(page, "10-admin-outbox");
    await context.close();
  }
  {
    const { context, page } = await session(browser, null, PHONE);
    await page.goto(`${BASE}/sign-in`);
    await shot(page, "00-sign-in-mobile");
    await context.close();
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

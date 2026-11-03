import { type Browser, type BrowserContext, expect, type Page, test as base } from "@playwright/test";

type DemoLabel = "Customer" | "Kitchen · Kondapur" | "Manager · Kondapur" | "Kitchen · Gachibowli" | "Menu admin";

/** Fails any test that trips the CSP or logs a console error. */
async function watch(page: Page) {
  const problems: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp ??= [];
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("favicon")) problems.push(m.text());
  });
  return async () => {
    const csp = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []).catch(() => []);
    expect(csp, "CSP violations").toEqual([]);
    expect(problems, "console errors").toEqual([]);
  };
}

export async function signedInPage(browser: Browser, label: DemoLabel, next = "/"): Promise<{ context: BrowserContext; page: Page; check: () => Promise<void> }> {
  const context = await browser.newContext({ baseURL: "http://localhost:3000", permissions: ["geolocation"] });
  const page = await context.newPage();
  const check = await watch(page);
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
  return { context, page, check };
}

/** Opens the kitchen board and taps through the start-of-shift screen. */
export async function openKitchen(page: Page, path = "/kitchen") {
  await page.goto(path);
  // The overlay mounts after hydration, so wait for it rather than checking once.
  await page.getByRole("button", { name: "Start shift" }).click({ timeout: 10_000 });
  await expect(page.getByRole("status").filter({ hasText: "Live" })).toBeVisible({ timeout: 15_000 });
}

/** Chooses a delivery area the way a customer would on the home page. */
export async function chooseArea(page: Page, area: string) {
  await page.goto("/");
  await page.getByRole("combobox", { name: /Choose your area|Deliver to/ }).selectOption({ label: area });
}

export const test = base;
export { expect };

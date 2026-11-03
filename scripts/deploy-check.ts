/**
 * Smoke test for a deployed environment. Usage: pnpm tsx scripts/deploy-check.ts https://your-app.onrender.com
 * Checks the health endpoint, that the menu renders, and that a demo customer can sign in.
 */
import { chromium } from "@playwright/test";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!base) throw new Error("Pass the deployed URL, e.g. https://company-a-direct.onrender.com");

async function check(name: string, run: () => Promise<void>) {
  try {
    await run();
    console.log(`✔ ${name}`);
  } catch (e) {
    console.error(`✘ ${name}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

async function main() {
  await check("health endpoint reaches the database", async () => {
    const res = await fetch(`${base}/api/health`);
    const body = (await res.json()) as { db?: boolean };
    if (!res.ok || !body.db) throw new Error(`status ${res.status}`);
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await check("menu page renders", async () => {
    const res = await page.goto(`${base}/o/kondapur`);
    if (!res?.ok()) throw new Error(`status ${res?.status()}`);
    await page.getByRole("heading", { name: "Kondapur" }).waitFor({ timeout: 20_000 });
  });

  for (const label of ["Customer", "Kitchen · Kondapur", "Menu admin"]) {
    await check(`demo sign-in: ${label}`, async () => {
      await page.context().clearCookies();
      await page.goto(`${base}/sign-in`);
      await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
      await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 20_000 });
    });
  }

  await browser.close();
}

main();

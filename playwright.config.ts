import { defineConfig, devices } from "@playwright/test";

// Specs and global setup talk to Supabase directly; locally its URL and keys live in .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI provides real environment variables instead.
}

export default defineConfig({
  testDir: "./e2e",
  // Tests share one seeded database and a live kitchen board, so they run one at a time.
  workers: 1,
  // Two signed-in browsers per test, and first-hit page compiles in dev, need more than the default 30 s.
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    permissions: ["geolocation"],
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

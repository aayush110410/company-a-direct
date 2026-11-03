# Company A Direct Ordering — Deployment

- **Live app:** _added after deployment_
- **Source:** _added after deployment_

## Demo logins

Every demo account uses the password **`Biryani@2026`**. You can also tap a role on the sign-in
page under **"Reviewing? Try a demo account"**; it signs you in without typing.

| Role | Email | What to try |
|---|---|---|
| Customer | `customer@example.com` | Pick an area (Kondapur), order, pay in test mode, watch the status page update live |
| Kitchen staff, Kondapur | `kitchen.kondapur@example.com` | The kitchen screen: tap **Start shift**, move tickets along, mark items sold out under **Stock** |
| Outlet manager, Kondapur | `manager.kondapur@example.com` | Everything the kitchen does, plus late-order alerts and **Adjust time** on a ticket |
| Kitchen staff, Gachibowli cloud kitchen | `kitchen.gachibowli@example.com` | A second outlet's board, to see that each kitchen only sees its own orders |
| Menu admin | `admin@example.com` | Central menu (prices per city, availability per outlet, photos), message outbox, demo tools |

**A two-window demo.** Open the Kondapur kitchen in one window and the customer in another (a
private window works). Place and pay for an order as the customer: the ticket drops onto the
kitchen rail within a couple of seconds. Tap **Start** in the kitchen: the customer's page moves
to "Cooking" without a reload.

**Demo tools** (signed in as admin, **Demo tools** in the top bar):
- **Reset demo data:** recreates the brief's three sample orders (WEB-778120, WEB-778131, WEB-778146)
  timed to now. WEB-778146 runs 4 minutes late, so its late alert fires about 6 minutes after a reset.
- **Simulate a dinner rush:** sends paid orders to one kitchen through the real estimate and shows
  how much longer the same dish is quoted once the queue has filled.

Payments, WhatsApp/SMS and the delivery partner are mocked (the brief asks for this). The payment
page says "Test mode" and lets you simulate success, failure or a timeout. Every message the
system would send is listed under **Messages** in the admin.

---

## Run it locally

### Prerequisites

- Node.js 24 (`.node-version` pins it) and pnpm (`corepack enable` provides the version in `package.json`)
- Docker Desktop, running
- Supabase CLI 2.x (`brew install supabase/tap/supabase`)

### Steps

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the local Supabase stack (Postgres, Auth, Realtime, Storage) in Docker:

   ```bash
   pnpm db:start
   ```

3. Create `.env.local` from the template, then fill it from the values `supabase status -o env` prints:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Value locally |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` (usually `http://127.0.0.1:54321`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |
   | `SUPABASE_DB_URL` | `DB_URL` (database tests only) |
   | `APP_URL` | `http://localhost:3000` |
   | `DEMO_MODE` | `true` |
   | `DEMO_USER_PASSWORD` | leave empty to use the documented demo password |

4. Apply the migrations and seed the data: 17 outlets, the menu, coupons, demo accounts, a
   prep-time model trained on six weeks of synthetic history, and the sample orders.

   ```bash
   pnpm db:reset
   ```

   The seed prints the model's accuracy against two simple baselines.

5. Start the app and open http://localhost:3000:

   ```bash
   pnpm dev
   ```

### Tests

| Command | What it covers | Needs |
|---|---|---|
| `pnpm test` | Unit tests: pricing, GST, coupons, outlet matching, schedules, order status rules, the prep-time model and promise, cart, order placement and payment rules, kitchen rules, UI components | nothing |
| `pnpm test:db` | Database: row-level security, single-winner status changes, payment confirmation, late-alert and expiry jobs | local Supabase |
| `pnpm e2e` | Browser end to end: order to kitchen and back live, failed payment retry, out-of-range area, kitchen resync after a dropped connection, role access, dinner rush | local Supabase + seeded data |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript | nothing |

Other scripts: `pnpm dev-order kondapur` drops one paid order on a kitchen board; `pnpm train:prep`
retrains the prep-time model from real orders (topped up with synthetic history while there are
fewer than 500).

---

## How it is deployed

| Piece | Where | Notes |
|---|---|---|
| Web app (Next.js 16) | Render web service, free plan, Singapore region | Built from `render.yaml`; health check `/api/health` |
| Database, Auth, Realtime, Storage | Supabase project, Mumbai region (`ap-south-1`) | Schema from `supabase/migrations`; the minute job runs inside Postgres with `pg_cron` |
| CI | GitHub Actions | `checks`: lint, typecheck, unit tests, gitleaks. `integration`: local Supabase, seed, DB tests, Playwright |
| Keep-alive | GitHub Actions schedule | Pings `/api/health` every 10 minutes while the repo variable `APP_URL` is set |

### Environment variables (names only)

Set these in the Render dashboard. Never commit them.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `APP_URL`
- `DEMO_MODE`
- `DEMO_USER_PASSWORD`
- `NODE_VERSION` (set to `24` by `render.yaml`)

### Deploying from scratch

1. Create a Supabase project, then link it and push the schema:

   ```bash
   supabase link --project-ref <project-ref>
   ```

   ```bash
   supabase db push
   ```

2. In Supabase **Authentication → Sign In / Providers → Email**, turn off **Confirm email** (demo
   accounts and reviewer sign-ups must work at once). In **URL Configuration**, set the Site URL to the
   Render URL.
3. Put the hosted URL and keys in a git-ignored `.env.production.local`, then seed:

   ```bash
   pnpm seed:remote
   ```

4. Create a Render web service from this repository (Render reads `render.yaml`) and enter the
   environment variables above.
5. Smoke-test the deployment:

   ```bash
   pnpm tsx scripts/deploy-check.ts https://<your-app>.onrender.com
   ```

### Known limits of the free tiers

- Render's free plan sleeps after 15 minutes without traffic. The first request after that takes
  about 30–60 seconds; the keep-alive workflow avoids this during review.
- Free Supabase projects pause after a week without activity. Restore the project from the Supabase
  dashboard if that happens; the keep-alive ping also counts as activity.
- The sign-in and order rate limits are kept in memory per app instance. Supabase Auth's own rate
  limits remain the backstop.

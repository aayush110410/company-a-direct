# Company A Direct Ordering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the core slice — customer ordering web app (menu, cart, coupons, mock payment, live status), central menu admin, and a real-time outlet kitchen display with an honest, load-aware prep-time estimate — on realistic seeded data.

**Architecture:** One Next.js 16 App Router app (TypeScript) on Render. Supabase provides Postgres (RLS-guarded reads + Realtime), Auth (email + password) and Storage; `pg_cron` runs minute jobs (late alerts, payment expiry, mock delivery) inside Postgres. Business rules are pure functions in `src/domain/*`; all writes go through server actions → core functions → service-role client or `security invoker` RPCs callable only by `service_role`; browsers only read, through RLS.

**Tech Stack:** Next.js 16.4, React 19, TypeScript (strict), Tailwind CSS 4, @supabase/supabase-js 2.118 + @supabase/ssr 0.12, Zod 4, Radix Dialog, lucide-react, sonner, Vitest 5, Playwright 1.64, Supabase CLI (local stack in Docker), pnpm, Node 24.

**Spec:** `docs/superpowers/specs/2026-11-02-direct-ordering-design.md` (assumptions A1–A13). Plan revision 2 folds in an adversarial review (13 confirmed high findings + medium/low fixes).

## Global Constraints

- Next.js 16: route protection in `src/proxy.ts` (`export async function proxy(req)` + `config.matcher` excluding `_next/static`, `_next/image`, `favicon.ico`, `api/health`, image files); `cookies()`, `headers()`, `params`, `searchParams` are async; every page that reads the DB or the clock calls `await connection()` (from `next/server`) so it is dynamic.
- Identity on the server comes from `supabase.auth.getClaims()` (verified JWT), never `auth.getSession()`; role and outlet are read from `profiles`.
- Money is integer paise; display via `formatINR`. Prices are GST-inclusive; GST line = `round(total × 5 / 105)`; every price surface shows **"Prices include 5% GST"**.
- Time zone for every rule and label: `Asia/Kolkata`, via `src/domain/time.ts` (Task 1). Domain functions take `now: Date`; never `new Date()` inside `src/domain`. SQL formats times with `to_char(x at time zone 'Asia/Kolkata', 'FMHH12:MI am')`.
- Every menu item shows veg / non-veg / egg mark, spice level, allergens; every outlet surface shows its FSSAI licence number.
- **Write path:** `actions.ts` (`'use server'`) → `requireActionRole()` → Zod → core function in `src/server/**` (no `'use server'`, takes `deps`/client + `now` as parameters) → `createAdminClient()` or a `service_role`-only RPC. Browser/anon clients never write any table.
- **Read path:** server components use `createServerClient()` (RLS as the user); client components subscribe/read with `createBrowserClient()` (RLS).
- `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; field?: string; details?: Record<string, unknown> }`. Actions never throw except Next's redirect/notFound; any `catch` calls `unstable_rethrow(e)` first.
- Secrets: only `.env.example` in git. `SUPABASE_SERVICE_ROLE_KEY` is read only by `src/server/env.ts` (consumed by `src/server/supabase/admin.ts`, which has `import 'server-only'`) and `scripts/lib/admin-client.ts`. Modules shared with scripts (`src/domain/**`, `src/server/demo/**`, `src/server/outbox.ts`, `src/server/orders/*-core` files) take a `SupabaseClient` or `deps` parameter and never import `server-only`, `next/*`, or `@/server/supabase/*`. No `'use client'` file imports from `@/server/`.
- PII: customer phone and address live only in `order_contacts` (customer-readable only, not in Realtime). Outbox phones are masked before reaching any page (`+91 9XXXX XX001`).
- Marketing messages require `profiles.marketing_opt_in = true`; order-status messages are `purpose = 'transactional'` (A9) — enforced in `enqueueMessage`.
- Kitchen display: dark theme, body text ≥ 24px, order id ≥ 32px, timers ≥ 40px, tap targets ≥ 64px; colour is never the only signal ("At risk", "Late by N min" text).
- Customer UI: mobile-first 360–430px, no horizontal scroll, tap targets ≥ 44px; loading, empty and error states on every data view.
- Promise rule (spec §6): `promise_minutes = max(ceil(p80_prep + travel), outlet.min_promise_minutes)`; `ready_by = promised_at − travel`; late alert when not delivered and `now > promised_at + 10 min`, exactly once.
- **Parallel waves:** agents edit only their task's listed files, run only their task's tests (`pnpm vitest run <their files>`), and do not commit. They end with "Report done". The orchestrator then runs `pnpm typecheck && pnpm test` for the whole tree and commits each task separately with the task's commit message.

## Review Focus

1. **Item goes out of stock or off schedule between cart and pay** → `placeOrder` fails with `details.unavailable` naming the line(s); checkout highlights them with Remove. Tests in Task 11 (`placeOrder rejects unavailable line`, `placeOrder rejects off-schedule line`).
2. **Two tablets tap "Start" at once** → one transition, one `order_events` row; loser gets "Order already moved" and refetches. Tests in Task 2 (`conditional transition is single-winner`) and Task 12 (`advanceOrder returns conflict`).
3. **Tablet drops off wifi / sleeps during a rush** → board refetches on reconnect/focus and shows orders placed in the gap within 20 s; pill shows Reconnecting meanwhile. Test in Task 14 (`kds resyncs after disconnect`, deterministic socket drop).
4. **Customer switches to an outlet in another city with a built cart** → cart is per outlet; switching prompts "Start a new cart at {outlet}?". Test in Task 10 (`cart store isolates outlets`).
5. **Pay tapped twice / reopened after expiry** → `confirm_payment` is single-winner and idempotent; expired orders show "This order expired — start again". Tests in Task 2 (`confirm_payment is single-winner`) and Task 11 (`completeMockPayment is idempotent`, `expired order cannot be paid`).

---

## Dependency Graph and Waves

```
Wave 0:  T1 scaffold (+ domain/time, result, env, demo-accounts, next.config images)
Wave 1:  T2 db | T3 money/pricing/coupons | T4 geo/schedule/availability | T5 status/urgency | T6 prep model | T8 design system
Wave 2:  T7 seed + shared server helpers (T2,T3,T4,T6)      T9 auth, roles, outlets repo (T2,T8)
Wave 3:  T10 customer menu+cart (T4,T7,T9)   T12 kitchen display (T5,T6,T7,T9)   T13 admin (T6,T7,T9)
Wave 4:  T11 checkout + payment + status (T3–T7,T9,T10)
Wave 5:  T14 e2e + CI db/e2e job + security + polish (all)
Wave 6:  T15 deploy (T14)  →  T16 docs + submission zip (T15)
```

Same-wave tasks touch disjoint files. Wave 1: `supabase/**` + `tests/db/**` | `src/domain/{money,pricing,coupons}*` | `src/domain/{geo,schedule,availability}*` | `src/domain/{order-status,urgency}*` | `src/domain/prep/**` | `src/components/ui/**`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/fonts.ts`, `src/app/dev/**`. Wave 2: `scripts/**`, `src/data/**`, `src/server/demo/**`, `src/server/outbox.ts` | `src/server/{supabase,auth*,rate-limit*,env}*`, `src/server/repo/outlets.ts`, `src/lib/realtime/channel.ts`, `src/proxy.ts`, `src/app/(auth)/**`, `supabase/config.toml` auth section. Wave 3: `src/app/(customer)/{page,layout,o}/**` + `src/components/menu/**` + `src/lib/cart/**` + `src/lib/location/**` + `src/server/repo/menu*` + `src/lib/realtime/use-live-availability.ts` | `src/app/kitchen/**` + `src/components/kitchen/**` + `src/lib/realtime/{board-reducer,use-live-board}*` + `src/lib/kitchen/**` + `src/server/{repo/kitchen,kitchen/**}` | `src/app/admin/**` + `src/components/admin/**` + `src/server/{admin/**,repo/admin.ts,demo/simulate-rush*}`. `src/lib/realtime/channel.ts` (shared subscribe helper) is created by T9 in wave 2, so T10, T11 and T12 all consume it.

---

### Task 1: Scaffold the repo, tooling, CI and shared primitives

**Files:**
- Create: Next app via `pnpm create next-app@16 . --yes --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-react-compiler`
- Delete: `src/app/page.tsx` and template assets in `public/` (the customer home lives in `src/app/(customer)/page.tsx`); replace with a temporary `src/app/(customer)/page.tsx` containing `<main>Company A</main>` so the build passes until Task 10.
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/stubs/empty.ts`, `tests/setup-dom.ts`, `.env.example`, `.github/workflows/ci.yml`, `.node-version` (`24`), `src/lib/result.ts`, `src/lib/env.public.ts`, `src/server/env.ts`, `src/lib/demo-accounts.ts`, `src/domain/time.ts`, `supabase/config.toml` (via `supabase init`), `README.md` stub
- Modify: `package.json` (scripts, `"packageManager": "pnpm@<installed version>"`, `"engines": { "node": ">=24" }`), `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`), `.gitignore`, `next.config.ts` (images)
- Test: `src/lib/result.test.ts`, `src/domain/time.test.ts`

**Interfaces:**
- `src/lib/result.ts`: `ActionResult<T>` (see Global Constraints), `ok<T>(data: T)`, `fail(error: string, field?: string, details?: Record<string, unknown>): { ok: false; ... }`.
- `src/lib/env.public.ts`: `publicEnv = z.object({ NEXT_PUBLIC_SUPABASE_URL: z.url(), NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1) }).parse({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY })` (literal references only).
- `src/server/env.ts`: `serverEnv(): { APP_URL: string; DEMO_MODE: boolean; SUPABASE_SERVICE_ROLE_KEY: string; DEMO_USER_PASSWORD: string } & typeof publicEnv` (DEMO_MODE default `true`; DEMO_USER_PASSWORD default `Biryani@2026` — a documented demo credential). No `server-only` import (scripts and Vitest load it).
- `src/lib/demo-accounts.ts`: `DEMO_ACCOUNTS = { customer: { email: 'customer@example.com', role: 'customer', label: 'Customer' }, kitchen: { email: 'kitchen.kondapur@example.com', role: 'kitchen_staff', outletSlug: 'kondapur', label: 'Kitchen · Kondapur' }, manager: { email: 'manager.kondapur@example.com', role: 'outlet_manager', outletSlug: 'kondapur', label: 'Manager · Kondapur' }, kitchenGachibowli: { email: 'kitchen.gachibowli@example.com', role: 'kitchen_staff', outletSlug: 'gachibowli-cloud-kitchen', label: 'Kitchen · Gachibowli' }, admin: { email: 'admin@example.com', role: 'admin', label: 'Admin' } } as const`; `type DemoKey = keyof typeof DEMO_ACCOUNTS`.
- `src/domain/time.ts`: `istClock(now: Date): { day: number /*0=Sun*/; minutes: number }`, `formatIstTime(d: Date): string` (→ "9:02 pm"), `IST = 'Asia/Kolkata'`.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`next typegen && tsc --noEmit`), `test` (`vitest run --project unit --project dom`), `test:db` (`vitest run --project db`), `e2e` (`playwright test`), `db:start` (`supabase start`), `db:reset` (`supabase db reset && pnpm seed`), `seed` (`tsx --env-file-if-exists=.env.local scripts/seed.ts`), `seed:remote` (`tsx --env-file=.env.production.local scripts/seed.ts`), `train:prep` (`tsx --env-file-if-exists=.env.local scripts/train-prep.ts`), `dev-order` (`tsx --env-file-if-exists=.env.local scripts/dev-order.ts`).
- `next.config.ts`: `images.remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }, new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/**`)]`, `images.dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production'`.

- [ ] **Step 1:** Scaffold; add deps `@supabase/supabase-js @supabase/ssr zod @radix-ui/react-dialog lucide-react sonner server-only`; dev deps `vitest @vitest/coverage-v8 @vitejs/plugin-react @playwright/test tsx @testing-library/react @testing-library/jest-dom jsdom`.
- [ ] **Step 2:** `.gitignore`: create-next-app's template ignores `.env*`; append `!.env.example`, `.env.production.local`, `playwright-report/`, `test-results/`, `submission/`. Verify `git check-ignore -q .env.example` exits 1 and `git check-ignore -q .env.local` exits 0.
- [ ] **Step 3:** Failing tests: `result.test.ts` (`ok(5)`; `fail('Nope','code',{ a: 1 })` deep-equals `{ ok: false, error: 'Nope', field: 'code', details: { a: 1 } }`); `time.test.ts` (`istClock(new Date('2026-11-06T14:00:00Z'))` → `{ day: 5, minutes: 1170 }`; `formatIstTime(new Date('2026-11-06T15:32:00Z'))` → `'9:02 pm'`; IST midnight rollover `2026-11-06T18:45:00Z` → day 6, minutes 15).
- [ ] **Step 4:** Run `pnpm test` → FAIL. Implement `result.ts`, `time.ts`. → PASS.
- [ ] **Step 5:** `vitest.config.ts` — root `plugins: [react()]`, `resolve.alias: { '@': path.resolve('src'), 'server-only': path.resolve('tests/stubs/empty.ts') }`; three projects with `extends: true`: `unit` (`src/**/*.test.ts`, `scripts/**/*.test.ts`, node), `dom` (`src/**/*.test.tsx`, jsdom, `setupFiles: ['tests/setup-dom.ts']`), `db` (`tests/db/**/*.test.ts`, node, `fileParallelism: false`, `testTimeout: 30000`, `env: loadEnv(mode, process.cwd(), '')`). `playwright.config.ts`: `workers: 1`, `fullyParallel: false`, `webServer: { command: 'pnpm build && pnpm start', url: 'http://localhost:3000/api/health', reuseExistingServer: !process.env.CI, timeout: 180_000 }`, `use: { baseURL: 'http://localhost:3000', permissions: ['geolocation'] }`, `globalSetup: './e2e/global-setup.ts'` (file created in Task 14).
- [ ] **Step 6:** `supabase init`; `config.toml`: `[auth] site_url = "http://localhost:3000"`, `[auth.email] enable_confirmations = false`.
- [ ] **Step 7:** `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `DEMO_MODE`, `DEMO_USER_PASSWORD` — empty values, one comment each. `ci.yml` job `checks`: `actions/checkout@v4` (`fetch-depth: 0`), `pnpm/action-setup@v4`, `actions/setup-node@v4` (node 24, pnpm cache), `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `gitleaks/gitleaks-action@v2`.
- [ ] **Step 8:** Verify `pnpm lint && pnpm typecheck && pnpm test && pnpm build` exit 0 (build with placeholder public env from `.env.example`-shaped `.env.local`).
- [ ] **Step 9:** Confirm `git ls-files --others --exclude-standard | grep .env.example`; commit `chore: scaffold next.js 16 app with vitest, playwright, supabase and ci`.

---

### Task 2: Database schema, RLS, RPCs, realtime and minute jobs

**Files:**
- Create: `supabase/migrations/20261102000001_schema.sql`, `supabase/migrations/20261102000002_rls.sql`, `supabase/migrations/20261102000003_rpc_realtime_jobs.sql`
- Create: `tests/db/helpers.ts`, `tests/db/rls.test.ts`, `tests/db/rpc.test.ts`, `tests/db/jobs.test.ts`
- Create: `src/server/db-types.ts` (generated: `supabase gen types typescript --local > src/server/db-types.ts`)

**Interfaces:**
- **Schema** (spec §5) with these deliberate changes:
  - `orders`: drop `customer_phone` and `delivery_address` (moved to `order_contacts`); add `preparing_at`, `revised_eta` (timestamptz null); `id text primary key default 'WEB-' || nextval('order_number_seq')`, `order_number_seq start 778200`.
  - `order_contacts(order_id text primary key references orders on delete cascade, customer_phone text not null, delivery_address text not null)`.
  - `prep_models`: `baseline_mae` → `baseline_mean_mae numeric not null`, add `baseline_rule_mae numeric not null`, `outlet_train_counts jsonb not null default '{}'`; partial unique index on `(is_active) where is_active`.
  - `outlet_item_availability` primary key `(outlet_id, item_id)`.
  - Enums: `user_role('customer','kitchen_staff','outlet_manager','admin')`, `order_status('awaiting_payment','placed','preparing','ready','handed_to_rider','delivered','expired','cancelled')`, `diet('veg','non_veg','egg')`, `availability_status('available','out_of_stock','hidden')`.
  - Indexes: `orders(outlet_id, status)`, `orders(customer_id, placed_at desc)`, `orders(status, promised_at)`.
  - Trigger `on_auth_user_created` (after insert on `auth.users`) → `public.handle_new_user()` (security definer, `set search_path = public`): inserts `profiles(id, role='customer', outlet_id=null, full_name, marketing_opt_in, marketing_opt_in_at)` taking only `full_name` and `marketing_opt_in` from `raw_user_meta_data`; role is hard-coded.
- **RLS** (`..._rls.sql`): `alter table … enable row level security` on every public table (cities, outlets, profiles, categories, menu_items, item_portions, item_prices, addons, outlet_item_availability, menu_schedules, coupons, orders, order_contacts, order_items, order_events, payments, prep_models, prep_estimates, alerts, outbox_messages); then `revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;` and `alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;`. Helpers `auth_role()`, `auth_outlet()` (security definer, stable, `set search_path = public`). Select policies only:
  - `anon, authenticated`: cities, outlets, categories, menu_items, item_portions, item_prices, addons, outlet_item_availability, menu_schedules.
  - `orders`, `prep_estimates`: `customer_id = auth.uid()` (prep_estimates via `exists` on orders) or `outlet_id = auth_outlet()` or `auth_role() = 'admin'`.
  - `order_items`, `order_events`, `payments`: `exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or o.outlet_id = auth_outlet() or auth_role() = 'admin'))`.
  - `order_contacts`: owning customer only.
  - `alerts`: `outlet_id = auth_outlet() or auth_role() = 'admin'`.
  - `profiles`: `id = auth.uid()`.
  - `coupons`, `prep_models`, `outbox_messages`: no policies (server reads via service role).
- **RPCs** (`security invoker`; each followed by `revoke execute … from public, anon, authenticated; grant execute … to service_role;`):
  - `transition_order(p_order_id text, p_from order_status, p_to order_status, p_actor uuid, p_reason text default null) returns boolean` — conditional `update … where id = p_order_id and status = p_from`; timestamp map: preparing→preparing_at, ready→ready_at, handed_to_rider→handed_at, delivered→delivered_at, cancelled→cancelled_at + `cancel_reason = p_reason` (raise if null), expired→none; raises if `p_to = 'placed'` (use `confirm_payment`). On success inserts `order_events`; on `ready` sets `prep_estimates.actual_minutes = ceil(extract(epoch from now() - paid_at) / 60)`.
  - `confirm_payment(p_order_id text, p_promised_at timestamptz, p_ready_by timestamptz, p_estimate jsonb, p_message jsonb) returns order_status` — one transaction: `update orders set status='placed', paid_at=now(), payment_status='succeeded', promised_at=p_promised_at, ready_by=p_ready_by where id=p_order_id and status='awaiting_payment'`; if 0 rows → return current status, write nothing; else insert `prep_estimates` from `p_estimate`, `order_events(awaiting_payment→placed)`, `update payments set status='succeeded'`, insert `outbox_messages` from `p_message`; return `'placed'`.
  - `override_promise(p_order_id text, p_promised_at timestamptz, p_ready_by timestamptz, p_reason text, p_actor uuid) returns boolean` — updates `orders.promised_at`, `ready_by`, `revised_eta = null`, `late_alerted_at = null`; updates `prep_estimates` (`source='manager_override'`, `override_reason`, `overridden_by`, `promised_at`); only for statuses placed/preparing/ready.
  - `run_order_jobs(p_now timestamptz default now(), p_order_ids text[] default null) returns jsonb` → `{"expired":n,"delivered":n,"late":n}`, every statement scoped by `(p_order_ids is null or id = any(p_order_ids))`:
    - expire `awaiting_payment` with `placed_at < p_now - 15 min` → `expired`, payment `expired`.
    - mock delivery (A5): `handed_to_rider` with `handed_at + travel_minutes * interval '1 min' ≤ p_now` → `delivered` + event + outbox WhatsApp to `order_contacts.customer_phone` "Delivered — enjoy your meal".
    - late: status in (placed, preparing, ready, handed_to_rider), `p_now > promised_at + 10 min`, `late_alerted_at is null` → `late_alerted_at = p_now`, `revised_eta = p_now + (travel_minutes + case status when 'placed' then 15 when 'preparing' then 10 when 'ready' then 5 else 0 end) * interval '1 min'`; always insert `alerts(kind 'late')` and customer WhatsApp ("Sorry — order {id} is running late. New estimate {IST time}"); insert one SMS per `profiles` row with `role='outlet_manager' and outlet_id = o.outlet_id and phone is not null` (zero is fine).
- **Cron:** `create extension if not exists pg_cron with schema pg_catalog;` then `select cron.unschedule('order-jobs') where exists (select 1 from cron.job where jobname = 'order-jobs');` then `select cron.schedule('order-jobs', '* * * * *', $$select public.run_order_jobs()$$);`.
- **Realtime:** `alter publication supabase_realtime add table orders, alerts, outlet_item_availability;` (not `order_contacts`, not `outbox_messages`).
- **Storage:** `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('menu-photos', 'menu-photos', true, 2097152, '{image/jpeg,image/png,image/webp}') on conflict do nothing;`.
- **Test helpers** (`tests/db/helpers.ts`): `adminClient()`; `createUser(role, outletId?) → { client, userId }` (admin API `createUser({ email_confirm: true })`, then service-role update of the trigger-created profile's `role`/`outlet_id`, then anon-key sign-in); `makeOutlet()`, `makeOrder(overrides) → orderId`; `beforeAll` unschedules `order-jobs`, `afterAll` reschedules it; all job tests pass `p_order_ids`.

- [ ] **Step 1:** Write the three migrations; `pnpm db:start`; `supabase db reset` → exit 0.
- [ ] **Step 2:** Write `helpers.ts`. Write failing tests:
  - `rls.test.ts`: `every public table has RLS` (`select tablename from pg_tables where schemaname='public' and not rowsecurity` → 0 rows, via `supabase db query` or a service-role `rpc` on a test-only view); `kitchen staff of outlet A cannot read outlet B orders`; `customer reads only own orders`; `customer B cannot read customer A order_items`; `customer cannot update order status`; `anon and customer cannot write server-only tables` (prep_models, payments, order_events inserts fail); `kitchen staff and admin cannot select order_contacts or outbox_messages`; `anon cannot list coupons`; `customer cannot change own role`; `direct signup with metadata role admin gets a customer profile`; `anon/customer cannot call privileged RPCs` (`transition_order`, `run_order_jobs`, `confirm_payment` → error code 42501).
  - `rpc.test.ts`: `conditional transition is single-winner` (two concurrent `transition_order(id,'placed','preparing')` → one true, one `order_events` row); `cancel requires reason`; `confirm_payment is single-winner` (two concurrent calls → both return 'placed', exactly 1 estimate, 1 event, 1 outbox row); `confirm_payment on expired returns expired and leaves payment pending`; `placed via confirm_payment sets paid_at, promised_at, ready_by`; `override_promise updates orders and estimate source`.
  - `jobs.test.ts`: `late job fires exactly once` (promised now−11 min, preparing; run twice → 1 alert, 1 customer WhatsApp, 1 manager SMS, `revised_eta` set); `late job ignores delivered and 9-minute-late orders`; `late job at outlet without manager still alerts`; `late message shows IST time`; `unpaid order expires after 15 min`; `handed order is delivered after travel time`.
- [ ] **Step 3:** `pnpm test:db` → fix migrations until all PASS.
- [ ] **Step 4:** Generate `src/server/db-types.ts`.
- [ ] **Step 5:** Report done (orchestrator commits `feat(db): schema, rls, service-only rpcs, realtime publication and minute jobs`).

---

### Task 3: Money, pricing and coupons (pure domain)

**Files:**
- Create: `src/domain/money.ts`, `src/domain/pricing.ts`, `src/domain/coupons.ts`
- Test: `src/domain/money.test.ts`, `src/domain/pricing.test.ts`, `src/domain/coupons.test.ts`

**Interfaces:**
- `formatINR(paise: number): string` → `formatINR(118000) === '₹1,180'`, `formatINR(12345) === '₹123.45'`, `formatINR(10000000) === '₹1,00,000'`.
- `gstIncludedPaise(totalPaise: number): number` = `Math.round(total * 5 / 105)`.
- `type CartLine = { itemId: string; portionId: string; qty: number; addonIds: string[] }`
- `type PriceBook = { portions: Record<string, { itemId: string; pricePaise: number }>; addons: Record<string, { itemId: string; pricePaise: number }> }`
- `type PricedLine = CartLine & { unitPaise: number; linePaise: number }`
- `priceCart(lines: CartLine[], book: PriceBook): { ok: true; lines: PricedLine[]; subtotalPaise: number } | { ok: false; error: 'unknown_portion' | 'unknown_addon' | 'bad_qty' | 'empty'; index?: number }` — qty integer 1–20; portion/addon must belong to the line's item; unit = portion + Σ addons.
- `type Coupon = { code: string; kind: 'percent' | 'flat'; value: number; minOrderPaise: number; maxDiscountPaise: number | null; validFrom: Date; validTo: Date; perCustomerLimit: number; isActive: boolean }` (`value`: percent, or paise for flat)
- `applyCoupon(coupon: Coupon | null, ctx: { subtotalPaise: number; now: Date; customerUses: number }): { ok: true; discountPaise: number } | { ok: false; reason: 'not_found' | 'not_started' | 'expired' | 'min_order' | 'limit_reached'; shortfallPaise?: number }` — inactive maps to `not_found`; percent `floor(subtotal × value / 100)` capped by max; flat `min(value, subtotal)`.
- `couponMessage(result: Extract<ReturnType<typeof applyCoupon>, { ok: false }>): string` — e.g. min_order → "Add ₹50 more to use this code"; not_found → "That code isn't valid".

- [ ] **Step 1:** Failing tests: WEB-778120 (Family pack 98000 + 2 × meetha 10000) → 118000; WEB-778131 (2 × 28000 + 8000) → 64000; WEB-778146 (3 × 35000) → 105000; `gstIncludedPaise(118000) === 5619`; foreign addon → `unknown_addon`; qty 0/21 → `bad_qty`; `DIRECT10` (10%, max 10000, min 30000) on 118000 → 10000, on 64000 → 6400, on 25000 → min_order shortfall 5000 and message "Add ₹50 more to use this code"; inactive → not_found; expired; limit; flat 7500 on 5000 → 5000.
- [ ] **Step 2:** `pnpm vitest run src/domain/money.test.ts src/domain/pricing.test.ts src/domain/coupons.test.ts` → FAIL. Implement → PASS.
- [ ] **Step 3:** Report done (commit `feat(domain): money formatting, gst, cart pricing and coupons`).

---

### Task 4: Geo matching and time-based availability (pure domain)

**Files:**
- Create: `src/domain/geo.ts`, `src/domain/schedule.ts`, `src/domain/availability.ts`
- Test: `src/domain/geo.test.ts`, `src/domain/schedule.test.ts`, `src/domain/availability.test.ts`

**Interfaces:**
- Consumes: `istClock`, `formatIstTime` from `@/domain/time` (T1).
- `type LatLng = { lat: number; lng: number }`; `type OutletGeo = LatLng & { id: string; radiusKm: number; isAcceptingOrders: boolean }`
- `haversineKm(a: LatLng, b: LatLng): number`; `travelMinutes(km: number): number` = `Math.min(Math.round(4 * km + 6), 45)` (A6)
- `matchOutlet(point: LatLng, outlets: OutletGeo[]): { kind: 'match'; outletId: string; distanceKm: number } | { kind: 'out_of_range'; nearestOutletId: string; distanceKm: number } | { kind: 'none' }`
- `type Schedule = { days: number[]; startsAt: string; endsAt: string }` ('HH:MM'); `isWithinSchedule(s: Schedule | null, now: Date): boolean` (null → true; overnight when `endsAt < startsAt`, `days` = start day); `nextOpeningLabel(s: Schedule, now: Date): string` → "Available from 5:00 pm".
- `type AvailabilityStatus = 'available' | 'out_of_stock' | 'hidden'`; `type ItemAvailability = { state: 'available' } | { state: 'out_of_stock' } | { state: 'hidden' } | { state: 'off_schedule'; label: string }`; `itemAvailability(input: { status: AvailabilityStatus | null; schedule: Schedule | null; isActive: boolean }, now: Date): ItemAvailability`; `isOrderable(a: ItemAvailability): boolean`.

- [ ] **Step 1:** Failing tests: Kondapur point (17.4700, 78.3570) matches Kondapur over Madhapur; Shamshabad (17.2403, 78.4294) → out_of_range with nearest; non-accepting outlet skipped; `travelMinutes(2.5) === 16`, `travelMinutes(20) === 45`; haleem {all days, 17:00–23:59} at 16:59 IST → off_schedule "Available from 5:00 pm", at 17:00 → available; overnight 22:00–02:00 at 01:30 next day → within.
- [ ] **Step 2:** Run own tests → FAIL. Implement → PASS.
- [ ] **Step 3:** Report done (commit `feat(domain): outlet matching by delivery radius and time-based availability`).

---

### Task 5: Order status machine and urgency (pure domain)

**Files:**
- Create: `src/domain/order-status.ts`, `src/domain/urgency.ts`
- Test: `src/domain/order-status.test.ts`, `src/domain/urgency.test.ts`

**Interfaces:**
- `type OrderStatus = 'awaiting_payment' | 'placed' | 'preparing' | 'ready' | 'handed_to_rider' | 'delivered' | 'expired' | 'cancelled'`; `type Actor = 'customer' | 'kitchen_staff' | 'outlet_manager' | 'admin' | 'system'`
- `canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean` — system: awaiting_payment→placed|expired, handed_to_rider→delivered; kitchen_staff/outlet_manager/admin: placed→preparing→ready→handed_to_rider, placed|preparing→cancelled; customer: none.
- `nextKitchenStatus(s: OrderStatus): OrderStatus | null`; `kitchenActionLabel(s: OrderStatus): string | null` ("Start", "Mark ready", "Hand to rider").
- `KITCHEN_COLUMNS = [{ key: 'placed', title: 'New' }, { key: 'preparing', title: 'Preparing' }, { key: 'ready', title: 'Ready for pickup' }, { key: 'handed_to_rider', title: 'With rider' }] as const`
- `kitchenUrgency(o: { status: OrderStatus; readyBy: Date }, now: Date): 'on_time' | 'at_risk' | 'late'` — placed/preparing only; at_risk when `readyBy − now ≤ 5 min`; late when `now > readyBy`.
- `minutesLate(promisedAt: Date, now: Date): number` (floor, ≥ 0); `customerStatusLabel(o: { status: OrderStatus; promisedAt: Date; revisedEta: Date | null }, now: Date): string` — "Late by 4 minutes" when past promise and not delivered; "New estimate 9:31 pm" appended when `revisedEta` set.
- `shouldRaiseLateAlert(o: { status: OrderStatus; promisedAt: Date; lateAlertedAt: Date | null }, now: Date): boolean`.

- [ ] **Step 1:** Failing tests: kitchen path valid; `ready→preparing` invalid; customer can't transition; urgency at −5:01 on_time, −5:00 at_risk, +0:01 late; WEB-778146 (promised 21:16, now 21:20) → 4, "Late by 4 minutes"; `shouldRaiseLateAlert` +10:00 false, +10:01 true, alerted false, delivered false.
- [ ] **Step 2:** Run own tests → FAIL. Implement → PASS.
- [ ] **Step 3:** Report done (commit `feat(domain): order status machine and kitchen urgency rules`).

---

### Task 6: Prep-time model — features, ridge regression, estimate, promise, synthetic history

**Files:**
- Create: `src/domain/prep/{features,ridge,model,model-row,promise,synthetic,random}.ts`
- Test: one `*.test.ts` beside each (except `random.ts`, covered by `synthetic.test.ts`)

**Interfaces:**
- Consumes: `istClock` from `@/domain/time` (T1).
- `type PrepFeatures = { workload: number; criticalItem: number; queueLoad: number; peak: 0 | 1 }`; `type PrepLine = { qty: number; basePrepMinutes: number; prepMultiplier: number }`
- `orderWorkload(lines: PrepLine[]): number`; `computeFeatures(input: { lines: PrepLine[]; openOrders: { status: 'placed' | 'preparing'; workload: number }[]; capacitySlots: number; at: Date }): PrepFeatures` — remaining: placed = workload, preparing = 0.5 × workload; `queueLoad = Σ remaining / capacitySlots`; `criticalItem = max(base × multiplier)`; `peak` = Fri/Sun 19:00–22:59 IST.
- `fitRidge(X: number[][], y: number[], lambda: number): number[]` (`[b0..bk]`, intercept unpenalised, Gaussian elimination with partial pivoting); `predictLinear(coefs: number[], x: number[]): number`; `featureVector(f: PrepFeatures): number[]` = `[workload, criticalItem, queueLoad, peak]`.
- `type PrepModel = { version: string; coefficients: number[]; residualP50: number; residualP80: number; featureRanges: Record<keyof PrepFeatures, { min: number; p95: number }>; trainN: number; mae: number; baselineMeanMae: number; baselineRuleMae: number; outletTrainCounts: Record<string, number>; trainedAt: string }`
- `type TrainingSample = { outletId: string; features: PrepFeatures; actualMinutes: number }`
- `trainPrepModel(samples: TrainingSample[], opts: { version: string; lambda?: number /*1*/; holdoutEvery?: number /*5*/; trainedAt: string }): PrepModel` — deterministic hold-out (every 5th); residual P50/P80 of `actual − predicted` on hold-out; `baselineMeanMae` (predict training mean) and `baselineRuleMae` (`fallbackPrep`) on the same hold-out.
- `fallbackPrep(f: PrepFeatures): number` = `f.criticalItem + 2 * f.queueLoad + 10`
- `type PrepEstimate = { predictedMinutes: number; p80Minutes: number; confidence: 'normal' | 'low'; source: 'model' | 'fallback'; modelVersion: string | null }`
- `estimatePrep(model: PrepModel | null, f: PrepFeatures, outletId: string): PrepEstimate` — null/non-finite → fallback (`p80 = fallbackPrep + 5`, low); low if any feature > p95 or `(outletTrainCounts[outletId] ?? 0) < 200` → `p80 = predicted + 1.5 × residualP80`; else `predicted + residualP80`; predicted clamped ≥ 5; whole minutes rounded up.
- `model-row.ts`: `type PrepModelRow = { version; coefficients: number[]; residual_p50; residual_p80; feature_ranges; train_n; mae; baseline_mean_mae; baseline_rule_mae; outlet_train_counts; trained_at; is_active }`; `toPrepModelRow(m: PrepModel, isActive: boolean): PrepModelRow`; `fromPrepModelRow(row: unknown): PrepModel | null` (Zod-validated; null on malformed/non-finite).
- `computePromise(input: { estimate: PrepEstimate; travelMinutes: number; outletMinPromiseMinutes: number; at: Date }): { promiseMinutes: number; promisedAt: Date; readyBy: Date; source: 'model' | 'fallback' | 'outlet_minimum' }`
- `applyOverride(input: { promisedAt: Date; travelMinutes: number; now: Date; deltaMinutes: number }): { ok: true; promisedAt: Date; readyBy: Date } | { ok: false; error: 'too_far' | 'in_past' }` — delta −30…+60; result > now and ≤ now + 120 min.
- `mulberry32(seed: number): () => number`; `gaussian(rand: () => number): number`
- `generateHistory(input: { outlets: { id: string; capacitySlots: number }[]; menu: { basePrepMinutes: number; prepMultipliers: number[] }[]; days: number; seed: number; endAt: Date }): TrainingSample[]` — header comment documents the process: per outlet per day 60–140 orders (×1.8 Fri/Sun dinner), 1–4 lines each; `actual = 6 + 0.30·workload + 0.55·criticalItem + 2.8·queueLoad + 4·peak + N(0, 3²)`, 3% "rush incidents" +8–15 min; clamp ≥ 8.

- [ ] **Step 1:** Failing tests:
  - `fitRidge` recovers `y = 2 + 3x1 − x2` within 1e-3 (λ = 1e-9).
  - `trainPrepModel` on `generateHistory(seed 42, 2 outlets, 42 days)` → `mae < baselineMeanMae` and `mae < baselineRuleMae`; `queueLoad` coefficient > 0; deterministic.
  - `estimatePrep(null, …)` → fallback/low; feature > p95 → low with wider p80; outlet with 150 samples → low; seeded-size outlet → normal.
  - `fromPrepModelRow(toPrepModelRow(m, true))` deep-equals `m`; corrupt row (`coefficients: ['x']`) → null.
  - `computePromise`: p80 30, travel 12, min 35 → 42, 'model'; p80 15, travel 10, min 35 → 35, 'outlet_minimum'; `readyBy = promisedAt − travel`.
  - `computeFeatures`: peak 1 Friday 19:30 IST, 0 Saturday 19:30; preparing counts half.
  - `applyOverride`: +10 ok; +90 too_far; −60 in_past.
- [ ] **Step 2:** Run own tests → FAIL. Implement → PASS.
- [ ] **Step 3:** Report done (commit `feat(domain): load-aware prep-time model with p80 promise and safe fallbacks`).

---

### Task 7: Seed data, shared server helpers, demo users and model training

**Files:**
- Create: `src/data/areas.ts`, `scripts/seed-data/{outlets,menu,coupons}.ts`, `scripts/lib/admin-client.ts`, `scripts/seed.ts`, `scripts/train-prep.ts`, `scripts/dev-order.ts`
- Create: `src/server/outbox.ts`, `src/server/demo/insert-paid-order.ts`, `src/server/demo/reset.ts`, `src/server/model-store.ts`
- Test: `scripts/seed-data/menu.test.ts`, `src/server/outbox.test.ts`

**Interfaces:**
- Consumes: `trainPrepModel`, `generateHistory`, `estimatePrep`, `computeFeatures`, `computePromise`, `toPrepModelRow`, `fromPrepModelRow` (T6); `priceCart` (T3); `travelMinutes`, `haversineKm` (T4); `DEMO_ACCOUNTS` (T1); `serverEnv` (T1); db (T2).
- `scripts/lib/admin-client.ts`: `adminClientForScripts(): SupabaseClient<Database>` (`createClient(url, serviceKey, { auth: { persistSession: false } })`).
- `AREAS: { slug: string; name: string; city: 'hyderabad' | 'bengaluru'; lat: number; lng: number }[]` (~20, incl. Shamshabad out of range).
- `enqueueMessage(client: SupabaseClient<Database>, msg: { channel: 'whatsapp' | 'sms'; toPhone: string; purpose: 'transactional' | 'marketing'; template: string; body: string; orderId?: string; customerId?: string }): Promise<{ queued: boolean; reason?: 'no_opt_in' }>` — marketing requires the customer's `marketing_opt_in`; pure helper `maskPhone(p: string): string` (→ `+91 9XXXX XX001`).
- `loadActiveModel(client): Promise<PrepModel | null>` in `src/server/model-store.ts` (select `is_active` row → `fromPrepModelRow`); `saveModel(client, m: PrepModel): Promise<void>` (deactivate others, insert active).
- `type PaidOrderRow = { order: { id?: string; customerId: string; outletId: string; status: OrderStatus; subtotalPaise; discountPaise; totalPaise; gstPaise; couponCode: string | null; paymentMethod: 'upi' | 'card'; distanceKm; travelMinutes; placedAt: Date; paidAt: Date; promisedAt: Date; readyBy: Date; preparingAt?: Date; readyAt?: Date }; contact: { phone: string; address: string }; items: { itemId; portionId; nameSnapshot; portionSnapshot; qty; unitPricePaise; addons: { id: string; name: string; pricePaise: number }[] }[]; estimate: { modelVersion: string | null; features: PrepFeatures; predictedMinutes; p80Minutes; confidence; outletMinMinutes; source } }`
- `insertPaidOrder(client: SupabaseClient<Database>, row: PaidOrderRow): Promise<string>` — inserts orders, order_contacts, order_items, payments(succeeded), prep_estimates, order_events; returns id.
- `resetDemoData(client: SupabaseClient<Database>, now: Date): Promise<void>` — deletes order-side rows; re-inserts via `insertPaidOrder`: `WEB-778120` (Kondapur; Chicken dum biryani Family pack ×1, Double ka meetha ×2; ₹1,180; UPI; placed now−11; promised placed+45; preparing), `WEB-778131` (Gachibowli cloud kitchen; Veg biryani ×2, Mirchi ka salan ×1; ₹640; Card; placed now−4; promised placed+40; ready), `WEB-778146` (Kukatpally; Mutton haleem ×3; ₹1,050; UPI; placed now−54; promised placed+50 → "Late by 4 minutes"; preparing) (A12); plus 6 extra Kondapur orders across New/Preparing/Ready. All orders belong to the demo customer.
- `scripts/dev-order.ts <outletSlug>` — one paid order with a real estimate (via `computeFeatures` + `loadActiveModel` + `estimatePrep` + `computePromise` + `insertPaidOrder`).
- Seed content (A2, A11): 2 cities; 17 outlets — Hyderabad: Kondapur, Kukatpally, Madhapur, Banjara Hills, Ameerpet, Secunderabad, Dilsukhnagar, Himayatnagar, Mehdipatnam, Miyapur, Charminar; cloud kitchens Gachibowli, Kompally, LB Nagar (slug `gachibowli-cloud-kitchen` etc.); Bengaluru: Indiranagar, Koramangala, Whitefield — real-area coordinates, radius 5 km (cloud 7 km), `min_promise_minutes` 35, `capacity_slots` 4 (cloud 6), clearly synthetic 14-digit FSSAI numbers. Menu (16 items): Biryani — Chicken dum biryani (Single ₹340 / Family pack ₹980), Mutton dum biryani (₹420 / ₹1,180), Veg biryani (₹280 / ₹760), Egg biryani (₹300 / ₹820); Haleem — Mutton haleem (₹350; schedule "Evenings" 17:00–23:59 daily); Starters — Chicken 65 (₹320), Apollo fish (₹380), Paneer 65 (₹290); Sides — Mirchi ka salan (₹80), Dahi chutney (₹40), Bagara baingan (₹180); Desserts — Double ka meetha (₹100), Qubani ka meetha (₹140), Phirni (₹90); Drinks — Irani chai (₹40), Fresh lime soda (₹70). Biryani add-ons: Extra salan ₹40, Extra raita ₹30, Boiled egg ₹20 (egg), Extra leg piece ₹120 (chicken/mutton only). Bengaluru = Hyderabad × 1.08 rounded to nearest ₹10. Each item: diet, spice 0–3, allergens, base prep (biryani 18 with Family pack ×1.6, haleem 6, starters 12, sides 3, desserts 4, drinks 3). Photos: Unsplash-licensed `images.unsplash.com` URLs with `?w=1200&q=75&auto=format`, each verified with `curl -sI` → 200 + `content-type: image/*`; photographer credit in `menu.ts`. Coupons: `DIRECT10` (10%, max ₹100, min ₹300, 60 days, 20 uses/customer), `FEAST75` (₹75 flat, min ₹699), `WELCOME` (expired).

- [ ] **Step 1:** Failing tests: `menu.test.ts` — every item priced in both cities; the three sample orders reproduce 118000 / 64000 / 105000 via `priceCart`; every item has photo, diet, allergens, base prep. `outbox.test.ts` — `maskPhone('+919000000001') === '+91 9XXXX XX001'`.
- [ ] **Step 2:** Write seed-data + helpers; tests PASS.
- [ ] **Step 3:** `scripts/seed.ts` (idempotent; upserts by slug/code): cities → outlets → schedules → menu → coupons → users (`auth.admin.createUser({ email, password, email_confirm: true })`, or `updateUserById` for the password if the email exists) → service-role update of `profiles.role/outlet_id/phone/full_name` → `generateHistory({ outlets: all 17, days: 42, seed: 20261102, endAt: now })` → `trainPrepModel` → `saveModel` → `resetDemoData(now)`. Print a metrics table (MAE vs both baselines, P80 residual).
- [ ] **Step 4:** `scripts/train-prep.ts`: samples from `prep_estimates` with `actual_minutes` (+ synthetic top-up when < 500 real), train, `saveModel`, print metrics.
- [ ] **Step 5:** Verify: `pnpm db:reset` exits 0; `select count(*) from outlets` → 17; three `WEB-7781xx` rows with totals 118000/64000/105000; seed table shows MAE < both baselines; a quick script check: `estimatePrep(await loadActiveModel(c), typicalKondapurFeatures, kondapurId).confidence === 'normal'`; `pnpm dev-order kondapur` prints a new WEB id.
- [ ] **Step 6:** Report done (commit `feat(seed): outlets, menu, coupons, demo users, sample orders and trained prep model`).

---

### Task 8: Design system (run `/impeccable` first)

**Files:**
- Modify: `src/app/globals.css` (Tailwind 4 `@theme` tokens), `src/app/layout.tsx` (fonts, `<Toaster />`, `lang="en-IN"`, metadata)
- Create: `src/app/fonts.ts`, `src/components/ui/{button,sheet,badge,diet-mark,spice,price,skeleton,empty-state,error-state,field,segmented,live-pill,stepper}.tsx`, `src/components/ui/index.ts`, `src/app/dev/ui/page.tsx` (gallery; `notFound()` unless `serverEnv().DEMO_MODE`)
- Test: `src/components/ui/diet-mark.test.tsx`, `src/components/ui/price.test.tsx`

**Interfaces:**
- `Button({ variant: 'primary' | 'secondary' | 'ghost' | 'danger'; size: 'md' | 'lg' | 'xl'; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>)`; `Sheet({ open, onOpenChange, title, children })` (Radix Dialog; bottom sheet < 640px); `DietMark({ diet: 'veg' | 'non_veg' | 'egg'; size?: number })` (accessible names "Vegetarian" / "Non-vegetarian" / "Contains egg"); `SpiceLevel({ level: 0 | 1 | 2 | 3 })`; `Price({ paise: number; className?: string })`; `Skeleton`; `EmptyState({ title, body, action? })`; `ErrorState({ title, body, onRetry? })`; `LivePill({ state: 'live' | 'reconnecting' | 'offline' })`; `Field`; `Segmented<T extends string>({ value, onChange, options })`; `Stepper({ value, min, max, onChange })`.
- Themes: customer (light, warm neutrals, one accent; photography carries colour); kitchen (`[data-theme="kitchen"]`: near-black, high-contrast, `--ok`, `--risk`, `--late` meeting WCAG AA on dark).

- [ ] **Step 1:** Run `/impeccable` (shape → craft) with the brief's design notes (minimal, white space, restrained palette, clear type, nothing without purpose; big food photos; checkout < 60 s; kitchen readable at 2 m with colour marking late orders; cheap Android tablets in hot, noisy kitchens) and the Global Constraints sizes. Record type pair, palette, spacing and radius scale as tokens.
- [ ] **Step 2:** Failing tests: `DietMark` accessible name per diet; `Price` renders `₹1,180` for 118000.
- [ ] **Step 3:** Implement components + gallery; tests PASS; screenshot gallery at 390px and 1280px in both themes; contrast check.
- [ ] **Step 4:** Report done (commit `feat(ui): design tokens and core components for customer and kitchen themes`).

---

### Task 9: Auth, roles, route protection and outlets repo

**Files:**
- Create: `src/server/supabase/{server,browser,admin}.ts`, `src/server/auth.ts`, `src/server/auth-rules.ts`, `src/server/rate-limit.ts`, `src/server/repo/outlets.ts`, `src/lib/realtime/channel.ts`, `src/proxy.ts`
- Create: `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/actions.ts`, `src/components/auth/demo-accounts.tsx`
- Modify: `supabase/config.toml` (`[auth.rate_limit] sign_in_sign_ups = 30`, `token_refresh = 150`)
- Test: `src/server/rate-limit.test.ts`, `src/server/auth-rules.test.ts`

**Interfaces:**
- `createServerClient(): Promise<SupabaseClient<Database>>`; `createBrowserClient(): SupabaseClient<Database>` (reads `publicEnv` only); `createAdminClient(): SupabaseClient<Database>` (`import 'server-only'`, `serverEnv()`).
- `type Role = 'customer' | 'kitchen_staff' | 'outlet_manager' | 'admin'`; `type Session = { userId: string; email: string; role: Role; outletId: string | null; fullName: string; phone: string | null }`
- `getSession(): Promise<Session | null>` — `getClaims()`, then profile; null if no profile.
- `requireRole(roles: Role[]): Promise<Session>` (pages/layouts; redirects to `/sign-in?next=…` or `homeFor(role)`); `requireActionRole(roles: Role[]): Promise<ActionResult<Session>>` (actions; `fail('Please sign in again', 'auth')`).
- `auth-rules.ts` (pure): `homeFor(role: Role): string` (customer `/`, staff/manager `/kitchen`, admin `/admin/menu`); `safeNext(next: string | null, role: Role): string` — accepts only same-origin relative paths (`new URL(next, 'http://x').origin === 'http://x'`, no leading `//` or `/\`) under the role's allowed prefixes (customer: `/`, `/o/`, `/checkout`, `/pay/`, `/orders/`; staff: `/kitchen`; admin: `/admin`, `/kitchen`), else `homeFor(role)`.
- `rateLimit(key: string, limit: number, windowMs: number, now?: number): { allowed: boolean; retryAfterMs: number }` (in-memory sliding window, single instance — documented); `clientIp(headers: Headers): string` (first `x-forwarded-for` hop).
- Actions: `signIn(formData) → ActionResult<{ redirectTo: string }>` (limit 5/min per `ip:email`); `signUp(formData)` (name, email, password ≥ 8, optional unchecked opt-in → `options.data { full_name, marketing_opt_in }`; profile comes from the trigger); `signInAsDemo(key: DemoKey)` (only when `DEMO_MODE`; limit 20/min per IP); `signOut()`.
- `repo/outlets.ts`: `type OutletSummary = OutletGeo & { slug: string; name: string; area: string; kind: 'outlet' | 'cloud_kitchen'; fssaiLicence: string; cityId: string; citySlug: string; minPromiseMinutes: number; capacitySlots: number }`; `getOutlets(): Promise<OutletSummary[]>`; `getOutletBySlug(slug: string): Promise<OutletSummary | null>`; `getOutletById(id: string): Promise<OutletSummary | null>` (server client; public RLS).
- `src/lib/realtime/channel.ts`: `subscribeTable<Row>(client: SupabaseClient, opts: { channel: string; table: 'orders' | 'alerts' | 'outlet_item_availability'; filter: string; onChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Row | null; old: Partial<Row> | null }) => void; onStatus: (s: 'live' | 'reconnecting' | 'offline') => void }): () => void` — awaits `auth.getSession()` + `realtime.setAuth()` before subscribing; resubscribes on `CHANNEL_ERROR`/`TIMED_OUT` with backoff; returns unsubscribe.
- `src/proxy.ts`: refresh session cookies (`@supabase/ssr` `createServerClient` with request/response cookies + `getClaims()`); redirect signed-out requests for `/kitchen`, `/admin`, `/checkout`, `/pay`, `/orders` to `/sign-in?next=…`.

- [ ] **Step 1:** Failing tests: `rateLimit` allows 5, blocks 6th, allows after window; `homeFor` mapping; `safeNext` → `'/'` for `https://evil.com`, `//evil.com`, `/\\evil.com`, `/%2F%2Fevil.com`, `javascript:alert(1)`, `/kitchen` (customer); keeps `/checkout` (customer) and `/kitchen` (kitchen_staff).
- [ ] **Step 2:** Implement; own tests PASS.
- [ ] **Step 3:** Sign-in page (server component passes `DEMO_MODE` and `DEMO_ACCOUNTS` labels to `demo-accounts.tsx`): email + password, inline errors, "Try a demo account" buttons; sign-up page with opt-in "Send me offers on WhatsApp (optional)".
- [ ] **Step 4:** Verify in browser (local Supabase with T7 seed — the orchestrator runs this after wave 2): each demo button lands on its home; customer `/kitchen` → `/`; signed-out `/checkout` → `/sign-in?next=/checkout`; forged `sb-*` cookie value is treated as signed out.
- [ ] **Step 5:** Report done (commit `feat(auth): email sign-in, demo accounts, verified-claims role guards and rate limiting`).

---

### Task 10: Customer home, outlet picker, menu and cart

**Files:**
- Create: `src/app/(customer)/layout.tsx`, `src/app/(customer)/page.tsx` (replaces T1 placeholder), `src/app/(customer)/o/[outletSlug]/{page,loading,error}.tsx`
- Create: `src/components/menu/{outlet-picker,outlet-card,menu-list,category-tabs,menu-item-card,item-sheet,cart-bar,switch-outlet-dialog}.tsx`
- Create: `src/lib/cart/store.ts`, `src/lib/location/store.ts`, `src/server/repo/menu.ts`, `src/server/repo/menu-mapper.ts`, `src/lib/realtime/use-live-availability.ts`
- Test: `src/lib/cart/store.test.ts`, `src/server/repo/menu-mapper.test.ts`

**Interfaces:**
- Consumes: `matchOutlet`, `travelMinutes`, `itemAvailability`, `isOrderable` (T4); `formatINR` (T3); UI kit (T8); `AREAS` (T7); `OutletSummary`, `getOutlets`, `getOutletBySlug`, `subscribeTable` (T9).
- `type MenuItemView = { id; name; description; photoUrl; diet: 'veg' | 'non_veg' | 'egg'; spiceLevel: 0 | 1 | 2 | 3; allergens: string[]; categoryId: string; portions: { id; name; pricePaise; prepMultiplier }[]; addons: { id; name; pricePaise; diet }[]; schedule: Schedule | null; isActive: boolean; availability: ItemAvailability; fromPricePaise: number }`; `type MenuView = { outlet: OutletSummary; categories: { id: string; name: string; items: MenuItemView[] }[] }`.
- `toMenuView(rows: MenuRows, outlet: OutletSummary, now: Date): MenuView` (pure, hidden excluded) in `menu-mapper.ts`; `getMenuForOutlet(outlet: OutletSummary, now: Date): Promise<MenuView>` in `menu.ts`.
- Cart (`cart:v1`): `type CartItem = CartLine & { key: string; name: string; portionName: string; unitPaise: number; addonNames: string[]; diet: string }`; `type Cart = { outletId: string; outletSlug: string; outletName: string; lines: CartItem[] }`; pure `cartReducer(cart: Cart | null, action)`; `useCart(): { hydrated: boolean; cart: Cart | null; add(item: Omit<CartItem, 'key'>, outlet: { id: string; slug: string; name: string }): 'added' | 'needs_switch'; switchOutlet(outlet): void; setQty(key: string, qty: number): void; remove(key: string): void; clear(): void; count: number; subtotalPaise: number }` — module-level cached snapshot, `getServerSnapshot` returns a stable sentinel, listens to `storage` events, try/catch around `localStorage`.
- Location (`location:v1`): `useDeliveryLocation(): { hydrated: boolean; location: { lat: number; lng: number; label: string; areaSlug: string | null } | null; set(loc): void }`.
- Home: area select (`AREAS`) + "Use my location" (deny → toast, keep select) → `matchOutlet` → outlet card (name, area, distance, "Arrives in about X min", FSSAI no.) → "See menu"; out-of-range → `EmptyState` "We don't deliver to {area} yet" + nearest outlet and distance.
- Menu: header (outlet, area, FSSAI no., "Prices include 5% GST"); sticky category tabs with scroll-spy; item cards (large photo, diet mark, name, from-price, spice, allergens); unavailable greyed with reason; item sheet (portion `Segmented`, add-ons, `Stepper`, "Add · ₹X"); `switch-outlet-dialog` on `needs_switch`; sticky `CartBar` ("2 items · ₹1,180 · View cart" → `/checkout`).
- `useLiveAvailability(outletId, initial: Record<string, AvailabilityStatus>)` — subscribes `outlet_item_availability` with `outlet_id=eq.{outletId}`, ignores payloads for other outlets.

- [ ] **Step 1:** Failing tests: `cart store isolates outlets` (`add` for a different outlet → `'needs_switch'`, cart unchanged; `switchOutlet` clears); identical lines merge; `setQty(key, 0)` removes; `toMenuView` excludes hidden and marks haleem off_schedule at 16:00 IST.
- [ ] **Step 2:** Implement; own tests PASS.
- [ ] **Step 3:** Build pages (each page `await connection()`), skeletons, empty and error states.
- [ ] **Step 4:** Verify in browser at 390×844 (after wave 3): Kondapur → menu → add Chicken dum biryani Family pack + 2 Double ka meetha → cart bar ₹1,180; Shamshabad → out-of-range; `update outlet_item_availability … 'out_of_stock'` via service SQL → item greys within 2 s.
- [ ] **Step 5:** Report done (commit `feat(customer): outlet picker by delivery radius, menu with live availability and cart`).

---

### Task 11: Checkout, order placement, mock payment and live order status

**Files:**
- Create: `src/app/(customer)/checkout/page.tsx`, `src/app/(customer)/pay/[orderId]/page.tsx`, `src/app/(customer)/orders/[orderId]/page.tsx`, `src/app/(customer)/actions.ts`
- Create: `src/components/checkout/{checkout-form,price-breakdown,promise-line,coupon-field}.tsx`, `src/components/payment/{upi-panel,card-panel,test-controls}.tsx`, `src/components/order/{status-timeline,late-notice}.tsx`
- Create: `src/server/orders/{types,schemas,quote,place-order,payment,order-view,deps}.ts`, `src/lib/realtime/use-live-order.ts`
- Test: `src/server/orders/place-order.test.ts`, `src/server/orders/payment.test.ts`, `src/server/orders/schemas.test.ts`

**Interfaces:**
- Consumes: `priceCart`, `applyCoupon`, `couponMessage`, `gstIncludedPaise` (T3); `matchOutlet`, `travelMinutes`, `itemAvailability`, `isOrderable` (T4); `formatIstTime` (T1); `customerStatusLabel` (T5); `computeFeatures`, `estimatePrep`, `computePromise` (T6); `loadActiveModel`, `enqueueMessage` (T7); `requireActionRole`, `rateLimit` (T9); `useCart`, `useDeliveryLocation` (T10); `subscribeTable` (T9).
- `type OrderDeps = { loadOutlet(id: string): Promise<OutletSummary | null>; loadPriceBook(outletId: string): Promise<PriceBook & { lines: Record<string, { name: string; portionName: string; basePrepMinutes: number; prepMultiplier: number }> }>; loadAvailability(outletId: string, itemIds: string[]): Promise<Record<string, { status: AvailabilityStatus | null; schedule: Schedule | null; isActive: boolean }>>; loadCoupon(code: string): Promise<Coupon | null>; countCouponUses(code: string, customerId: string): Promise<number>; loadOpenOrders(outletId: string): Promise<{ status: 'placed' | 'preparing'; workload: number }[]>; loadActiveModel(): Promise<PrepModel | null>; insertOrder(row, contact: { phone: string; address: string }, items, payment): Promise<string>; getOrder(id: string): Promise<{ id; customerId; outletId; status: OrderStatus; travelMinutes; lines: PrepLine[]; totalPaise } | null>; confirmPayment(id: string, promisedAt: Date, readyBy: Date, estimate: object, message: object): Promise<OrderStatus>; setPaymentStatus(orderId: string, status: 'failed' | 'pending'): Promise<void> }` — `deps.ts` implements it over `createAdminClient()` (`confirmPayment` → `confirm_payment` RPC). Core files have no `'use server'`.
- `type QuoteInput = { outletId: string; lines: CartLine[]; couponCode?: string; deliveryLat: number; deliveryLng: number }`
- `quoteOrder(input: QuoteInput, customerId: string, deps: OrderDeps, now: Date): Promise<ActionResult<{ subtotalPaise; discountPaise; totalPaise; gstPaise; promisedAt: string; promiseMinutes: number; confidence: 'normal' | 'low'; unavailable: { index: number; reason: string }[]; couponError?: string }>>`
- `placeOrder(input: QuoteInput & { address: string; phone: string; paymentMethod: 'upi' | 'card' }, customerId: string, deps: OrderDeps, now: Date): Promise<ActionResult<{ orderId: string }>>` — re-validates range (out of range → `fail("We don't deliver to this address", 'address')`), availability (→ `fail('Some items are no longer available', 'lines', { unavailable })`), coupon (→ `fail(couponMessage(r), 'coupon')`), prices; inserts `awaiting_payment` order (provisional promise), contact, items, pending payment.
- `completeMockPayment(input: { orderId: string; outcome: 'succeed' | 'fail' | 'timeout' }, customerId: string, deps: OrderDeps, now: Date): Promise<ActionResult<{ status: OrderStatus; redirectTo: string; message?: string }>>` — not the customer's → `fail('Order not found')`; status past `awaiting_payment` → same ok result, no writes; `expired` → `fail('This order expired — start again')`; succeed → features vs current open orders → `estimatePrep` → `computePromise(at = now)` → `confirmPayment(...)` with WhatsApp "Order {id} confirmed — arriving by {formatIstTime}" (returned status `expired` → expired failure; other non-placed → idempotent result); fail → `setPaymentStatus('failed')`, redirect back to pay page; timeout → message "We couldn't confirm the payment yet".
- `schemas.ts`: phone `^(\+91)?[6-9]\d{9}$` → normalised `+91XXXXXXXXXX`; address 10–200; lines 1–30; couponCode uppercase `^[A-Z0-9]{3,16}$`.
- `actions.ts`: `quoteOrderAction(input: unknown)` (rate limit 30/min/customer), `placeOrderAction(input: unknown)` (10/min/customer), `payAction(input: unknown)`, `getOrderViewAction(orderId: string)` — each `requireActionRole(['customer'])` → Zod → core with `session.userId`, real deps, `new Date()`.
- `type OrderView = { id; status: OrderStatus; outletName; outletFssai; placedAt; paidAt: string | null; preparingAt: string | null; readyAt: string | null; handedAt: string | null; deliveredAt: string | null; promisedAt: string; revisedEta: string | null; totalPaise; items: { name; portion; qty }[] }`; `getOrderView(client, orderId)` (RLS server client).
- `useLiveOrder(orderId: string, initial: OrderView): { order: OrderView; connection: 'live' | 'reconnecting' }` — `subscribeTable` on `orders` `id=eq.{orderId}`; refetch via `getOrderViewAction` on change, reconnect, visibility, and every 20 s.
- Checkout UI: delivery (address, phone prefilled; location from `useDeliveryLocation`), lines with steppers, coupon field, `PriceBreakdown` (Subtotal, Discount, Total, "Includes ₹X GST (5%)"), `PromiseLine` ("Arrives by 9:02 pm"; low → "Busy kitchen — estimate may shift"), method `Segmented`, "Pay ₹X"; unavailable lines highlighted with Remove. Pay page: banner **Test mode — no money moves**; UPI (VPA prefilled `demo@upi`, mock QR); Card (test card `4242 4242 4242 4242`, Luhn-checked client-side, never sent); Succeed / Fail / Time out. Status page: timeline with times, promise, `customerStatusLabel`, late notice with revised ETA, outlet FSSAI no., `LivePill`.

- [ ] **Step 1:** Failing tests (in-memory fake deps): `placeOrder rejects unavailable line` (details.unavailable indices); `placeOrder rejects off-schedule line` (haleem at 16:00 IST); `placeOrder ignores client prices`; out-of-range → field 'address'; bad coupon → field 'coupon'; `completeMockPayment is idempotent` (second succeed → same status, `confirmPayment` called once); `succeed persists final promise` (`confirmPayment` receives `computePromise(at = now)` values); `expired order cannot be paid`; `succeed on order expired mid-flow → fail`; `promise uses outlet minimum when model is fast`; `payment fail keeps awaiting_payment`; another customer's order → 'Order not found'; `schemas.test.ts` phone normalisation and rejection.
- [ ] **Step 2:** Implement; own tests PASS.
- [ ] **Step 3:** Build pages (`await connection()`); verify at 390×844: menu → checkout → UPI succeed → status updates live while a kitchen tab advances it; late notice after `update orders set promised_at = now() - interval '11 min'` + `select run_order_jobs()`; time a signed-in run (target < 60 s).
- [ ] **Step 4:** Commit `feat(checkout): server-priced orders, coupons, honest promise, mock upi/card payment and live status`.

---

### Task 12: Kitchen display (real-time)

**Files:**
- Create: `src/app/kitchen/layout.tsx` (`data-theme="kitchen"`, `requireRole(['kitchen_staff','outlet_manager','admin'])`), `src/app/kitchen/page.tsx` (admin picks `?outlet=slug`; `await connection()`), `src/app/kitchen/actions.ts`
- Create: `src/components/kitchen/{board,order-card,column,shift-start-overlay,stock-drawer,override-sheet,alert-banner,clock}.tsx`
- Create: `src/lib/realtime/board-reducer.ts`, `src/lib/realtime/use-live-board.ts`, `src/lib/kitchen/chime.ts`, `src/server/repo/kitchen.ts`, `src/server/kitchen/core.ts`
- Test: `src/lib/realtime/board-reducer.test.ts`, `src/server/kitchen/core.test.ts`

**Interfaces:**
- Consumes: `KITCHEN_COLUMNS`, `nextKitchenStatus`, `kitchenActionLabel`, `kitchenUrgency`, `canTransition` (T5); `applyOverride` (T6); `enqueueMessage` (T7); `requireActionRole`, `getOutletBySlug`, `getOutletById`, `subscribeTable` (T9); RPCs `transition_order`, `override_promise` (T2); `formatIstTime` (T1).
- `type BoardOrder = { id: string; status: OrderStatus; paidAt: string; readyBy: string; promisedAt: string; travelMinutes: number; items: { name: string; portion: string; qty: number; addons: string[] }[]; confidence: 'normal' | 'low'; source: string; lateAlerted: boolean }`; `type KitchenAlert = { id: string; orderId: string; message: string; createdAt: string; acknowledgedAt: string | null }`
- `boardReducer(state: Record<string, BoardOrder>, event: { type: 'snapshot'; orders: BoardOrder[] } | { type: 'upsert'; order: BoardOrder } | { type: 'remove'; id: string }): Record<string, BoardOrder>` — upserts with delivered/cancelled/expired/awaiting_payment remove the card.
- `repo/kitchen.ts`: `getBoard(client, outletId): Promise<{ orders: BoardOrder[]; alerts: KitchenAlert[] }>`; `getBoardOrder(client, id): Promise<BoardOrder | null>` (RLS server client).
- `useLiveBoard(outletId: string, initial: { orders: BoardOrder[]; alerts: KitchenAlert[] }): { orders: BoardOrder[]; alerts: KitchenAlert[]; connection: 'live' | 'reconnecting' | 'offline'; newOrderIds: Set<string> }` — `subscribeTable` on `orders` and `alerts` (both `outlet_id=eq.{outletId}`); on order change fetch `getBoardOrderAction(id)`; full snapshot on SUBSCRIBED, `online`, visibility→visible, every 20 s; 'live' only after SUBSCRIBED and a successful snapshot. When `DEMO_MODE`, exposes `window.__kds = { disconnect(), reconnect() }` for the e2e resync test.
- `core.ts` (no `'use server'`): `advanceOrderCore(input: { orderId: string; from: OrderStatus }, session: Session, deps: KitchenDeps): Promise<ActionResult<{ status: OrderStatus }>>` (other outlet → 'Not your outlet'; invalid → 'Not allowed'; RPC false → `fail('Order already moved', 'conflict')`); `cancelOrderCore({ orderId, reason }, session, deps)`; `setItemStockCore({ itemId, status: 'available' | 'out_of_stock' }, session, deps)` (always upsert, never delete); `overridePromiseCore({ orderId, deltaMinutes, reason }, session, deps, now): Promise<ActionResult<{ promisedAt: string }>>` (outlet_manager/admin only; `applyOverride` → `override_promise` RPC → WhatsApp "Updated arrival time {h:mm}"); `acknowledgeAlertCore({ alertId }, session, deps)` (manager/admin). `type KitchenDeps = { getOrderMeta(id): Promise<{ outletId: string; status: OrderStatus; promisedAt: Date; travelMinutes: number; customerPhone: string } | null>; transition(id, from, to, actor, reason?): Promise<boolean>; overridePromise(id, promisedAt, readyBy, reason, actor): Promise<boolean>; upsertStock(outletId, itemId, status, actor): Promise<void>; ackAlert(alertId, actor): Promise<boolean>; enqueue(msg): Promise<void> }`.
- `actions.ts`: `advanceOrder`, `cancelOrder`, `setItemStock`, `overridePromise`, `acknowledgeAlert`, `getBoardOrderAction`, `getBoardAction` — each `requireActionRole([...])` → Zod → core.
- `chime.unlock(): void`, `chime.play(): void` (Web Audio two-tone); the shift-start overlay tap unlocks audio and requests Wake Lock + fullscreen where supported.
- Board UI: header (outlet, live clock, `LivePill`, column counts, Stock, role badge); four columns; card: id ≥ 32px, items ≥ 24px, elapsed since paid, "Ready by 8:47" with urgency colour + text, low-confidence tag, one ≥ 64px action; new cards pulse once + chime; manager: "Adjust time" + red banner for unacknowledged alerts. ≥ 1024px grid; portrait → swipeable column tabs.

- [ ] **Step 1:** Failing tests: reducer snapshot/upsert/remove; `advanceOrder returns conflict` when transition false; other outlet → 'Not your outlet'; kitchen_staff `overridePromiseCore` → 'Not allowed'; override +90 → `fail` with too_far copy; `setItemStockCore` never deletes.
- [ ] **Step 2:** Implement; own tests PASS.
- [ ] **Step 3:** Verify with two kitchen.kondapur tabs: `pnpm dev-order kondapur` → card in New within 2 s with chime; Start in tab A → tab B updates; manager: `update orders set promised_at = now() - interval '11 min' where id = …` + `select run_order_jobs()` → red banner; `select * from outbox_messages where order_id = …` shows customer WhatsApp + manager SMS; readability at 1280×800.
- [ ] **Step 4:** Report done (commit `feat(kitchen): real-time kitchen display with timers, urgency, stock toggles and manager overrides`).

---

### Task 13: Menu admin, message outbox and demo tools

**Files:**
- Create: `src/app/admin/layout.tsx` (`requireRole(['admin'])`), `src/app/admin/menu/page.tsx`, `src/app/admin/menu/[itemId]/page.tsx`, `src/app/admin/menu/new/page.tsx`, `src/app/admin/outbox/page.tsx`, `src/app/admin/demo/page.tsx`, `src/app/admin/actions.ts`
- Create: `src/components/admin/{admin-nav,item-table,item-editor,price-grid,availability-grid,photo-upload,schedule-select}.tsx`, `src/server/admin/menu-schema.ts`, `src/server/repo/admin.ts`, `src/server/demo/simulate-rush.ts`
- Test: `src/server/admin/menu-schema.test.ts`, `src/server/demo/simulate-rush.test.ts`

**Interfaces:**
- Consumes: `resetDemoData`, `insertPaidOrder`, `PaidOrderRow`, `loadActiveModel`, `maskPhone` (T7); `computeFeatures`, `estimatePrep`, `computePromise`, `mulberry32` (T6); `requireActionRole` (T9); UI kit (T8).
- `ALLERGENS = ['dairy','nuts','gluten','egg','fish','soy','sesame','mustard'] as const`
- `makeMenuItemSchema(cityIds: string[])` (Zod + `superRefine`): name 2–60; description ≤ 160; diet; spiceLevel 0–3; allergens ⊆ ALLERGENS; basePrepMinutes 1–90; categoryId; scheduleId | null; photoUrl url; portions 1–4 × `{ id?; name 1–30; prepMultiplier 0.5–3; prices: Record<cityId, rupees int 1–10000> }` with every city required; addons ≤ 8 × `{ id?; name; priceRupees 0–2000; diet }`.
- Actions (`requireActionRole(['admin'])`): `saveMenuItem(input) → ActionResult<{ itemId }>` (rupees → paise; upsert item/portions/prices/addons, delete removed; `revalidatePath('/', 'layout')`); `setAvailability({ itemId, outletId, status })` (upsert); `createPhotoUploadUrl({ itemId, contentType: 'image/jpeg' | 'image/png' | 'image/webp', size ≤ 2_097_152 }) → ActionResult<{ path: string; token: string; publicUrl: string }>` (server-generated `crypto.randomUUID()` path; browser uploads via `uploadToSignedUrl`; the bucket enforces type/size); `archiveMenuItem({ itemId })`; `resetDemo()`; `simulateRush({ outletId, count: 1–15 })`.
- `type RushDeps = { loadOutlet(id: string): Promise<{ id; capacitySlots; minPromiseMinutes; lat; lng }>; loadMenuLines(outletId: string): Promise<{ itemId; portionId; name; portionName; pricePaise; basePrepMinutes; prepMultiplier }[]>; loadOpenOrders(outletId: string): Promise<{ status: 'placed' | 'preparing'; workload: number }[]>; loadActiveModel(): Promise<PrepModel | null>; insertPaidOrder(row: PaidOrderRow): Promise<string> }`; `simulateRushCore(input: { outletId: string; count: number; now: Date; seed: number }, deps: RushDeps): Promise<{ orderIds: string[]; promiseMinutes: number[] }>` — random 1–3-line carts through features → estimate → promise; each inserted order counts in the next one's load.
- `repo/admin.ts` (admin client after role check): `listItems(filters)`, `getItemForEdit(id)`, `listOutletsByCity()`, `listOutbox(limit): Promise<{ id; channel; toMasked: string; purpose; template; body; orderId; createdAt }[]>` (masked server-side).
- Item list: search, category and diet filters; row: thumb, name, diet mark, Hyderabad/Bengaluru from-price, "Unavailable at N outlets". Editor: Basics, Photo, Portions & city prices grid, Availability by outlet (grouped by city), Schedule, Kitchen (base prep); sticky save bar; unsaved-changes guard. Outbox: newest first, channel icon, masked phone, purpose chip, body, order link. Demo page: Reset demo data, Simulate dinner rush (outlet + count), links per demo role.

- [ ] **Step 1:** Failing tests: schema rejects spice 4, price 0, unknown allergen, portion missing a city price (with two test city ids); `simulateRushCore` returns `count` orders, all `promiseMinutes ≥ 35`, non-decreasing for identical carts as load grows.
- [ ] **Step 2:** Implement; own tests PASS.
- [ ] **Step 3:** Verify with SQL + admin UI: save Veg biryani Hyderabad Single ₹290 → `item_prices` row = 29000; mark Mutton haleem unavailable at Kukatpally → availability row; upload a photo → public URL loads; Simulate rush (10) at Kondapur → 10 new orders with estimates; outbox shows masked phones.
- [ ] **Step 4:** Report done (commit `feat(admin): central menu cms with city prices, outlet availability, outbox and demo tools`).

---

### Task 14: End-to-end tests, CI db/e2e job, security hardening and polish

**Files:**
- Create: `e2e/global-setup.ts` (`resetDemoData(adminClientForScripts(), new Date())`), `e2e/fixtures.ts`, `e2e/order-flow.spec.ts`, `e2e/kitchen-resync.spec.ts`, `e2e/access.spec.ts`, `e2e/admin.spec.ts`, `src/app/api/health/route.ts`
- Modify: `next.config.ts` (headers), `.github/workflows/ci.yml` (second job), screens per review findings, `DESIGN.md` (create via impeccable-documenter)

**Interfaces:**
- `/api/health` → `{ ok: true, db: true }` after `select id from outlets limit 1` via admin client; 503 on DB failure.
- CSP (static; built in `next.config.ts` from `NEXT_PUBLIC_SUPABASE_URL` = `S` and `NODE_ENV`): `default-src 'self'; script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com ${S}; connect-src 'self' ${S} ${S.replace(/^http/, 'ws')}; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` plus `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), camera=(), microphone=()`, `X-Content-Type-Options: nosniff`.
- Fixtures: `customerPage`, `kitchenPage` (signs in via demo button, dismisses shift-start overlay); `page.addInitScript` records `securitypolicyviolation` events; `afterEach` asserts zero violations and zero console errors.

- [ ] **Step 1:** `order-flow.spec.ts`: customer → Kondapur → Chicken dum biryani Family pack → checkout → `DIRECT10` → Pay UPI → Succeed → status "Placed"; kitchen page (open first) shows the new id without reload; kitchen Start → customer shows "Preparing" without reload; payment Fail → retry → Succeed; Shamshabad → out-of-range copy; the full signed-in checkout completes in < 60 s.
- [ ] **Step 2:** `kitchen-resync.spec.ts` — `kds resyncs after disconnect`: `window.__kds.disconnect()` (pill → Reconnecting), customer places + pays, `window.__kds.reconnect()` → order visible within 25 s, pill Live. Second case: `context.setOffline(true/false)` fires offline/online → snapshot refetch.
- [ ] **Step 3:** `access.spec.ts`: customer `/kitchen` → `/`; kitchen.gachibowli sees no Kondapur ids; signed-out `/admin/menu` → sign-in. `admin.spec.ts`: price change shows on customer menu; Simulate rush fills the Kondapur board live.
- [ ] **Step 4:** `pnpm e2e` (webServer builds and starts the app against local Supabase) → all PASS; `pnpm build` output shows `ƒ` for `/`, `/o/[outletSlug]`, `/kitchen`.
- [ ] **Step 5:** CI job `integration`: `supabase/setup-cli@v1` → `supabase start` → write `.env.local` from `supabase status -o env` → `pnpm seed` → `pnpm test:db` → `pnpm exec playwright install --with-deps chromium` → `pnpm e2e`; upload `playwright-report/` on failure.
- [ ] **Step 6:** Security pass: `/security-review`; `gitleaks detect --no-banner` clean; `grep -rn SUPABASE_SERVICE_ROLE_KEY src | grep -v src/server/env.ts` empty; `grep -rl "'use client'" src | xargs grep -l "@/server/"` empty; `grep -rl "'use server'" src/server` empty; every `actions.ts` export parses with Zod and calls `requireActionRole`.
- [ ] **Step 7:** Polish with `/impeccable` (critique → polish) on all 8 screens at 390px and 1280px; Lighthouse mobile on the menu page: Accessibility ≥ 95, Performance ≥ 85; impeccable-documenter writes `DESIGN.md`.
- [ ] **Step 8:** Commit `test(e2e): order, realtime resync, access and admin flows; ci integration job; security headers`.

---

### Task 15: Deploy (Supabase + Render) — requires user confirmation before creating cloud resources

**Files:**
- Create: `render.yaml` (`type: web`, `runtime: node`, `plan: free`, `region: singapore`, build `corepack enable && pnpm install --frozen-lockfile && pnpm build`, start `pnpm start`, `healthCheckPath: /api/health`, envVars: `NODE_VERSION=24` plus `sync: false` entries for the six app env names), `scripts/deploy-check.ts`, `.github/workflows/keepalive.yml` (`schedule: cron: '*/10 * * * *'` during review, curls `${{ vars.APP_URL }}/api/health`)

- [ ] **Step 1:** Ask the user to confirm creating: Supabase project `company-a-direct` (ap-south-1), public GitHub repo `company-a-direct`, Render web service. Wait for yes.
- [ ] **Step 2:** Create the Supabase project; `supabase link`; `supabase db push`; in Auth settings disable "Confirm email", set Site URL and redirect URLs to the Render URL, set auth rate limits as in `config.toml` (`supabase config push` or dashboard); verify `select jobname, schedule from cron.job` shows `order-jobs`.
- [ ] **Step 3:** The user puts hosted URL + keys in gitignored `.env.production.local` (never in chat or git); run `pnpm seed:remote`.
- [ ] **Step 4:** `gh repo create company-a-direct --public --source . --push`; create the Render service from `render.yaml`; the user enters env values in the Render dashboard; set repo variable `APP_URL`.
- [ ] **Step 5:** `pnpm tsx scripts/deploy-check.ts https://<render-url>` → health 200 with `db: true`, menu page 200, sign-in as each demo role, sign up + immediate sign-in of a throwaway customer; manual check with a phone (customer) and a laptop (kitchen).
- [ ] **Step 6:** Commit `chore(deploy): render blueprint, keepalive and deploy smoke check`.

---

### Task 16: TDD, deployment.md and submission zip

**Files:**
- Create: `deployment.md`, `docs/TDD.md` (source), `docs/TDD.docx` (via docx skill; PDF if available), `docs/screenshots/*.png`, `submission/company-a-direct.zip` (gitignored)

- [ ] **Step 1:** `deployment.md`: local run (Node 24, pnpm, Docker, Supabase CLI; `pnpm i`; `pnpm db:start`; `cp .env.example .env.local` and fill from `supabase status -o env`; `pnpm db:reset`; `pnpm dev`), tests (`pnpm test`, `pnpm test:db`, `pnpm e2e`), deployment (Supabase + Render, env var names only, hosted auth settings, Render free-tier cold start and Supabase free-tier pausing + keepalive), demo logins table (5 accounts, shared demo password).
- [ ] **Step 2:** TDD: GitHub URL + live URL at the top; architecture + rationale (A vs B vs C); data model incl. the PII split; main flows (order, kitchen, late) as diagrams; AI section (generating process, features, metrics vs both baselines from the seed log, unsure/wrong handling, why not an LLM); UI decisions per key screen with screenshots; assumptions A1–A13; security model (read via RLS, write via server, service-only RPCs, role trigger); tests; what was cut (loyalty, party orders, dashboard, reorder suggestions, OTP sign-in, real gateway and messaging) and next steps; honest limits (per-instance rate limit, synthetic training data, straight-line distance, `'unsafe-inline'` CSP, free-tier cold start).
- [ ] **Step 3:** Export the TDD; zip TDD + `deployment.md`; size < 25 MB.
- [ ] **Step 4:** Commit `docs: technical design document and deployment guide`.

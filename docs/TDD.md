# Company A — Direct Ordering
## Technical Design Document

**GitHub:** _added after deployment_
**Live app:** _added after deployment_ (demo logins in `deployment.md`; every demo account's password is `Biryani@2026`)

Author: Aayush Sharma · Built over a 7-day window, solo · November 2026

---

## 1. Summary

Company A pays delivery apps 25–30% of every order and owns none of its customers. This build is the
**core slice** of the direct channel that replaces part of that:

- **Customer ordering web app** (mobile-first): pick an area or share your location → the nearest
  kitchen that delivers there → a short menu with big photos, portions and add-ons → cart → coupon →
  test-mode UPI or card payment → a **live order status page**.
- **Central menu admin**: one menu; prices per city; availability per outlet; time-based items;
  photos; veg/non-veg/egg marks, spice and allergens.
- **Kitchen display per outlet**: paper tickets on a steel rail, updating **in real time**; timers,
  colour and text for at-risk and late orders, rider handoff, sold-out switches, manager overrides.
- **AI: a load-aware prep-time estimate.** It sets an honest delivery promise and behaves safely
  when it is wrong or unsure.

Everything runs on realistic seed data: the brief's three sample orders (re-timed to "now"), 17
outlets and a 16-dish menu. Payments, WhatsApp/SMS and the delivery partner are mocked, as the
brief asks.

**What I chose not to build:** loyalty points, party orders and the outlet dashboard (optional
"Must have" depth). I spent that time making the core slice production-quality: tests at three
levels, real security boundaries, and a design that holds up on a phone and on a kitchen tablet.

## 2. Assumptions (labelled)

The brief is the only source of facts. Where it was silent, I chose the following and labelled each
one so it can be challenged.

| # | Assumption | Why |
|---|---|---|
| A1 | Besides *customer* and *kitchen staff* (the brief's roles), there is an **admin** (central menu team) and an **outlet manager** per outlet, who can override promises and receives late alerts. | Someone must own the central menu; the brief's override rule needs a manager. |
| A2 | "Prices by city" means more than one city. Seeded as 11 outlets + 3 cloud kitchens in Hyderabad and 3 outlets in Bengaluru (14 + 3, as in the brief); Bengaluru prices are 8% higher, rounded to ₹10. | The brief gives the counts and "prices by city" but no city list. |
| A3 | The **promised time** is delivery-to-door. The kitchen works to "ready by" = promise − travel time. | The sample promises are 40–50 min after placement, consistent with prep plus travel. |
| A4 | "The outlet's minimum" is a per-outlet minimum promise in minutes (35 by default). | From the rule "the higher of the AI estimate and the outlet's minimum". |
| A5 | A mock delivery partner marks an order delivered once its travel time has passed after handoff. | A rider app is out of scope, but the late rule needs a delivery event. |
| A6 | Distance is straight-line from a chosen area or the browser's location; travel = 4 min/km + 6 min, capped at 45. | No paid maps API (mocked outside systems). |
| A7 | Menu prices include 5% GST; the GST line shown = total × 5/105. | "Prices include 5% GST and must say so." |
| A8 | Customers sign in with email and password; the phone number is collected at checkout. | Decision, to keep sign-in reliable without an SMS provider. |
| A9 | Order-status messages are transactional and need no opt-in; marketing needs an explicit opt-in with a timestamp. Messages are written to an outbox, not sent. | DPDP Act 2023; mocked messaging. |
| A10 | The prep-time model is first trained on six weeks of **synthetic** history from a documented generating process. | The brief has no historical data. |
| A11 | Food photos are Unsplash-licensed stand-ins, credited on screen; admins can upload real photos. FSSAI numbers are synthetic (99… prefix). | No assets or licence numbers were provided. |
| A12 | All times are IST. The seed re-times the sample orders to "now", keeping their status and placed→promised gap. | The sample uses 20:14–21:16 clock times. |
| A13 | Unpaid orders expire after 15 minutes and never reach the kitchen. | Avoids phantom tickets from abandoned payments. |
| A14 | Coupons are seeded (`DIRECT10`, `FEAST75`, an expired `WELCOME`) because the brief asks for coupons but names none. Haleem is an evening dish (17:00–23:59) to exercise time-based menus. | Needed to demonstrate those features. |

## 3. Architecture

```
 Customer phone ─┐                               ┌── Supabase Postgres (row-level security)
 Kitchen tablet ─┼── HTTPS ── Next.js 16 on Render ──┤     orders · menu · estimates · alerts · outbox
 Admin laptop  ──┘     server actions → core rules   │     pg_cron, every minute: late alerts,
        ▲                                            │       unpaid-order expiry, mock delivery
        │                                            ├── Supabase Auth (email + password, roles)
        └──── WebSocket: Realtime, RLS-filtered ─────┴── Supabase Realtime · Storage (menu photos)
```

**One Next.js app, with Supabase doing the heavy lifting.** I compared three shapes:

| Option | Verdict |
|---|---|
| **A. Next.js monolith + Supabase** (Postgres, Auth, Realtime, Storage, pg_cron) | **Chosen.** One codebase and one deploy; the hard part (real-time kitchen updates) sits on a managed feature built for it. |
| B. Separate API server + single-page app | Two deploys and more glue for no gain at this scale: 1,200 orders/hour at peak is about 20 a minute. |
| C. Next.js + Supabase Edge Functions | Splits business rules across two runtimes; harder to test and to explain. |

**Read and write paths are deliberately different.**
- **Reads** go through **row-level security (RLS)**: kitchen staff can only ever read their own
  outlet's orders; customers only their own. RLS is enforced by the database, so it holds even if
  app code has a bug, and the Realtime subscriptions use it too.
- **Writes** never come from the browser. A server action checks the caller's role, validates
  input with Zod, then calls a plain-TypeScript core function, which writes with the service role
  or through a database function only the server may call. Browsers have **no** insert/update
  grants on any table (tested).

**Business rules are pure functions** in `src/domain/` (money, pricing, coupons, geo, schedules,
the status machine, urgency, the prep model) that take `now` as a parameter. That is why they are
fast to test and easy to read.

**Real-time, built to survive a cheap tablet.** The kitchen board subscribes to its outlet's
order changes, but treats Realtime as a speed-up, not the source of truth. It re-reads the full
board on subscribe, on reconnect, when the tab comes back to the front, and every 20 seconds, and it
shows a **Live / Reconnecting / Offline** pill. An end-to-end test cuts the connection on purpose,
places an order during the gap and checks the board recovers it.

**Status changes are single-winner.** `transition_order` updates only if the order is still in the
status the tablet saw, so two tablets tapping "Start" at once produce exactly one change (tested
with concurrent calls). Payment confirmation is one database transaction (`confirm_payment`): final
promise, estimate, event, payment and message together. Tapping Pay twice, or paying an order that
expired a moment earlier, is safe (tested).

**Next.js 16 choices.** Next 16 replaces `middleware` with `proxy.ts` (used to refresh sessions
and keep signed-out visitors out of private routes). I turned off the new Cache Components /
partial prerendering default: every page here is per-user or live, and the classic dynamic model
is simpler to reason about.

## 4. Data model

Money is integer paise; times are `timestamptz`, read in IST.

| Area | Tables |
|---|---|
| Places | `cities`, `outlets` (coordinates, delivery radius, FSSAI licence, minimum promise, cooking capacity, accepting-orders switch) |
| People | `profiles` (role, outlet for staff, name, phone, marketing opt-in with timestamp). Created by a database trigger that **always** makes a customer; staff roles are granted by the server only. |
| Menu | `categories`, `menu_items` (photo, diet mark, spice, allergens, base prep minutes, optional schedule), `item_portions` (with a prep multiplier, e.g. Family pack ×1.6), `item_prices` (per portion **per city**), `addons`, `outlet_item_availability` (available / sold out / hidden per outlet), `menu_schedules`, `coupons` |
| Orders | `orders` (status, totals, GST, travel time, placed/paid/promised/ready-by and stage timestamps, late flag, revised ETA), **`order_contacts`** (phone and address, split out), `order_items` (name, price and prep snapshots), `order_events` (audit trail), `payments` |
| AI | `prep_models` (versioned coefficients, error quantiles, feature ranges, per-outlet training counts, accuracy vs baselines), `prep_estimates` (inputs, prediction, P80, confidence, source, promise, override reason, **actual minutes** once ready) |
| Alerts and messages | `alerts` (late orders), `outbox_messages` (mocked WhatsApp/SMS, marked transactional or marketing) |

**Personal data is isolated (DPDP).** The customer's phone and address live in `order_contacts`.
Only the customer who placed the order can read it; kitchens and even admin screens never receive
the raw number (the outbox page masks it on the server: `+91 9XXXX XX001`), and the table is not
published over Realtime.

**Order status machine:** `awaiting_payment → placed → preparing → ready → handed_to_rider →
delivered`, plus `expired` (unpaid 15 min) and `cancelled` (by the kitchen, with a reason, while
placed or preparing). "Late by N min" is computed for display, not stored as a status.

## 5. Main flows

**Ordering (customer).**
1. The customer picks an area or shares their location. The nearest outlet whose radius covers them
   is matched; if none does, they see "We don't deliver to … yet" and the nearest kitchen's distance.
2. The menu shows that city's prices, that outlet's stock and time windows, with "Prices include 5%
   GST" and the FSSAI number. Sold-out items grey out **live** when a kitchen pauses them.
3. Checkout re-quotes on every change: total, GST line, and **"Arrives by 9:02 pm"** from the
   kitchen's current load.
4. On "Pay", the server re-reads every price, coupon rule and availability. Nothing the browser
   sends about money or time is trusted. If a dish sold out, changed, or is outside its hours, that
   **line** is flagged with Remove; the rest of the cart is kept.
5. The test-mode payment page simulates success, failure or a timeout. On success the order is
   re-estimated against the kitchen *at that moment*, confirmed atomically, and a WhatsApp
   confirmation goes to the outbox.
6. The status page updates live (Realtime plus a 20-second refetch). It shows the order's paper
   ticket and "N tickets ahead of yours" (a count only; no other customer's data leaves the server).

**Kitchen.** Tap **Start shift**, which unlocks the new-order chime and keeps the screen awake.
Tickets drop into **New** with a chime. One large button moves each ticket along: Start → Mark ready →
Hand to rider. Card colour and text change at "At risk" (5 minutes before ready-by) and "Late by N
min". **Stock** pauses a dish on every customer menu at once. Managers also get **Adjust time** and
late-order alerts.

**When an order runs late.** Every minute, `pg_cron` runs `run_order_jobs`. An order more than 10
minutes past its promise and not delivered gets, **exactly once**: an alert on the manager's kitchen
screen, an SMS to the outlet manager, and a WhatsApp to the customer with a revised estimate. The
customer's page shows "Late by N minutes · New estimate 9:31 pm". The same job expires unpaid
orders and lets the mock rider deliver.

## 6. The AI part: honest prep-time estimates

**Why this matters.** An app that promises 30 minutes and delivers in 55 loses the customer. The
brief asks for a promise that is honest because it comes from **current kitchen load**.

**Why not an LLM.** Predicting a number from a few structured inputs is a regression problem. An
LLM would be slower, cost money per order, give different answers to the same question, and be hard
to evaluate. A small, explainable model is the right tool, and every coefficient can be justified in
a review.

**Inputs** (captured at payment, stored with every estimate):

| Feature | Meaning |
|---|---|
| `workload` | Σ quantity × base prep minutes × portion multiplier, i.e. total cooking in the order |
| `criticalItem` | the slowest single line (a dum biryani takes as long as it takes) |
| `queueLoad` | orders ahead per cooking slot (orders already cooking count as half) |
| `peak` | Friday or Sunday dinner, 19:00–23:00 IST (the brief's peaks) |

**Model.** Ridge regression, solved in closed form in TypeScript (no ML dependency), trained on a
20% hold-out split. Training data is six weeks of synthetic orders for all 17 outlets (63,628
training orders). They come from a documented process: 60–140 orders a day, more at Friday and
Sunday dinner, replayed through a simple kitchen queue, with noise and 3% "rush incidents". The model
never sees the true coefficients and has to learn them.

**Accuracy on held-out orders:**

| Predictor | Mean absolute error |
|---|---|
| **This model** | **2.6 minutes** |
| Hand-written rule (slowest item + 2 × queue + 10) | 5.0 minutes |
| Always predicting the average | 10.2 minutes |

The model recovers the generating coefficients almost exactly (e.g. 2.50 minutes per order ahead
per slot against a true 2.5). On real data these numbers will be worse; that is why every estimate
is logged next to the actual prep time, and `pnpm train:prep` retrains from real orders.

**From estimate to promise.**
- We promise against the **80th percentile** (prediction + the 80th percentile of past errors),
  not the average, so 4 in 5 orders beat the promise.
- `promise = max(⌈P80 prep + travel⌉, outlet minimum)`, as the brief requires. The kitchen's
  "ready by" is the promise minus travel.

**When it is unsure.** If any input is beyond what the model has seen (above its 95th percentile,
e.g. an unusually backed-up kitchen), or the outlet has fewer than 200 training orders, the
estimate is marked **low confidence**. The safety margin widens by 1.5×, the ticket and checkout say
so ("Busy kitchen right now: we've added a safety margin"), and the customer is not over-promised.
If the model row is missing or corrupt, a documented fallback rule takes over; **ordering never
fails because of the model**.

**When it is wrong.**
1. The outlet minimum is a floor under every promise.
2. Managers can move a promise (−10 to +20 min) with a reason; it is logged as a manager override,
   the customer is told the new time, and the late flag resets.
3. Ten minutes past the promise, the late alert fires once, and the customer gets a revised estimate.
4. Every estimate stores its inputs, the model version and the actual time, for monitoring and
   retraining.

**Seeing it work.** In the admin's **Demo tools**, "Simulate a dinner rush" sends paid orders
through the same path and reports how the same dish's quote changes (e.g. "A Chicken dum biryani
now quotes 35 min in the kitchen, up from 30 min before the rush").

## 7. UI and design decisions

**One world: a chef's open kitchen at night.** I explored several visual directions with a
structured design process and chose this one for its premium, restaurant-grade feel. Customers
order at "the pass": slate and steel, warm white type, food photography lit like plated dishes, and
**one brass accent reserved for the single action you can take** (See the menu, Add, Pay). The
kitchen screen uses the same world: **paper tickets on a steel rail**, the physical object kitchens
use today. Admin works on light "paper", because it is used in a daytime office.

**Type.** Gloock (a high-contrast display serif) for dish names and big moments; Hanken Grotesk for
UI and numbers, with tabular figures so prices and timers line up.

**Key screens and why they look this way** (screenshots in `docs/screenshots/`):

| Screen | Decision |
|---|---|
| Home | On a phone the photo owns the top half and fades into slate, so the headline never fights the food. One question first: where are you? The outlet card answers "who delivers, how far, roughly how long" and shows the FSSAI number. |
| Menu | Biryani and haleem get big photographs; sides, desserts and drinks are compact rows. Short and scannable, as the brief asks. Diet marks differ by **shape** (dot vs triangle), not just colour. A sticky strip names the section you are in. |
| Item sheet | A bottom sheet on phones: portion, extras, quantity, then one "Add · ₹980" button. |
| Checkout | One screen, under a minute (the end-to-end test asserts it). The arrival time is the hero, priced lines and the GST line underneath. |
| Pay | A test-mode banner, then the same calm layout. Failure and timeout are one tap away, for reviewers. |
| Order status | A live timeline, and the same paper ticket the kitchen sees, clipped to the rail: the signature moment that makes "straight to the kitchen" visible. |
| Kitchen display | Readable from two metres: order numbers ≥32 px, items ≥24 px, buttons ≥64 px for wet or gloved hands. Colour **and** text mark urgency. One action per ticket; destructive Cancel sits apart. |
| Admin | A plain table and a focused editor: prices per city in a grid, availability per outlet as switches, photo upload, archive. |

**States everywhere.** Loading skeletons, empty states with a next action, inline errors with
retry, a "Reconnecting" pill, an out-of-range state, sold-out and "Available from 5:00 pm" labels,
and expired and failed payments.

**Accessibility.** WCAG 2.2 AA contrast, verified per theme. Focus rings are themed, tap targets are
≥44 px (≥64 px in the kitchen), and reduced motion is respected.

## 8. Security and privacy

- **No secrets in the repository**: only `.env.example`. gitleaks runs in CI and over the full git
  history (clean).
- **Access control in two layers**: role checks on every page and server action, plus database RLS.
  Tested: kitchen A can't read kitchen B's orders; customers can't read each other's orders, items
  or contact details; nobody in a browser can write any table or call the privileged functions.
- **Roles can't be self-assigned**: a sign-up asking for "admin" still gets a customer profile
  (tested).
- **Validated inputs**: Zod on every server action. Phone numbers are normalised to +91 mobiles;
  coupon codes are pattern-checked; quantities are bounded.
- **Server-side prices**: totals, discounts, GST and promises are recomputed on the server.
- **Sign-in**: identity comes from a verified JWT (`getClaims`); redirects after sign-in only go to
  same-site paths the role may open (open-redirect tests). There are rate limits on sign-in,
  sign-up, quotes and orders.
- **Headers**: a Content-Security-Policy limited to this site, Supabase and Unsplash;
  `frame-ancestors 'none'`, `nosniff`, a strict referrer policy and a permissions policy.
- **Uploads**: photos go straight to Storage through a server-issued signed URL; the bucket enforces
  type (JPEG/PNG/WebP) and size (2 MB).

## 9. Testing

| Level | Count | What it covers |
|---|---|---|
| Unit and component (Vitest) | 179 tests, 31 files | Pricing and GST (including the brief's three totals), coupons, outlet matching, IST schedules, the status machine, urgency, the prep model (fit, accuracy beats both baselines, confidence, fallback, promise floor, override bounds), the cart, order placement and payment rules (unavailable or changed lines, tampered prices, double pay, expiry), kitchen rules, rush simulation, UI components |
| Database (Vitest + local Supabase) | 29 tests | RLS on every table; single-winner transitions and payment confirmation under concurrency; late alerts fire once (and still fire at an outlet without a manager); expiry and mock delivery. RLS tests were checked by switching RLS off and watching them fail. |
| End to end (Playwright) | 9 tests | Order → kitchen sees it live → kitchen starts it → customer sees it live; failed payment retry; out-of-range area; kitchen recovers after a dropped connection and after going offline; role access; a dinner rush fills a board |

Each end-to-end test also fails on any Content-Security-Policy violation or console error.

## 10. Deployment

Next.js on a Render web service (free plan, Singapore region); Supabase for the database, auth,
realtime and storage (Mumbai region). GitHub Actions runs lint, typecheck, unit tests and gitleaks,
then an integration job that boots Supabase in CI, seeds it, and runs the database and end-to-end
tests. Step-by-step setup, environment variable names and demo logins are in `deployment.md`.

## 11. What I cut, and what I'd do next

**Cut, by choice:** loyalty points, party orders with catering-manager confirmation, the outlet
dashboard, reorder suggestions, phone-OTP sign-in, a real payment gateway, real WhatsApp/SMS, and
delivery-app integration (out of scope).

**Next, in order:**
1. **Real payments and messaging:** Razorpay (UPI intent plus a webhook into `confirm_payment`) and
   WhatsApp Business templates for the outbox messages.
2. **Loyalty points**, since they map straight onto the "35% reorder within a month" success
   metric, and the outlet dashboard (prep time vs promise, cancellations, repeat customers), which
   can read from `prep_estimates` and `order_events` as they stand.
3. **Retrain on real orders weekly** and watch promise accuracy by outlet; add per-outlet terms
   once each kitchen has enough history.
4. **Party orders** with minimum notice and catering-manager confirmation.
5. **Phone OTP** sign-in once an SMS provider is in place.
6. **Operational hardening:** a shared rate limiter (Redis) instead of per-instance memory, a CSP
   nonce, error monitoring, and a paid tier with no cold starts.

## 12. Honest limits

- The model is trained on **synthetic** data, so its 2.6-minute error is a ceiling of what the
  method can do, not a measured real-world number.
- Distance is straight-line, not road distance; travel time is a simple formula.
- The rate limiter is per app instance; Supabase Auth's limits are the backstop.
- The CSP allows inline scripts because Next.js needs them without a per-request nonce.
- Free-tier hosting: Render sleeps when idle (a keep-alive ping runs during review) and Supabase
  pauses inactive free projects.
- Food photos are stock stand-ins and some are approximate (e.g. qubani ka meetha).

## 13. How I used AI

I used Claude Code throughout: to brainstorm and write the spec and plan, to stress-test the plan
with an adversarial multi-reviewer pass (it caught 13 serious issues before any code, including an
RLS gap and a payment race), to scaffold code under test-first discipline, to search for licensed
photos, and for review. The product decisions are mine: what to cut, the honest-promise rule (P80
plus a floor), the safety behaviours when the model is wrong, the PII split, the visual direction
(I steered it through three rounds to "a luxury chef's kitchen"), and the trade-offs above. I can
explain each of them.

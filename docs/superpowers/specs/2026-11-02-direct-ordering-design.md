# Company A Direct Ordering — Design Spec

Date: 2026-11-02 · Status: approved in brainstorming, pending written-spec review

## 1. Intent

Company A (Hyderabad biryani chain, 14 outlets + 3 cloud kitchens) pays delivery apps 25–30% per
order and owns no customer data. They want their own ordering site that is faster and nicer than the
apps, with one menu they control, and orders that land on the right outlet's kitchen screen.

This build ships the **core slice** end to end, polished to production quality:

- Customer ordering web app (mobile-first): outlet by location and delivery radius, menu with photos,
  portions and add-ons, cart, coupons, test payment (UPI / card), live order status.
- Central menu admin.
- Outlet kitchen display (KDS) with real-time order updates.
- AI: prep-time estimate from current kitchen load, with explicit handling when it is wrong or unsure.

Explicitly **not** built (optional depth, cut by decision): loyalty points, party orders, the
outlet dashboard, reorder suggestions. Out of scope per brief: delivery-app integration, rider app,
billing/inventory replacement.

Success for this submission: a reviewer can sign in with demo logins, place and pay for an order on a
phone-width screen in under a minute, watch it appear on the kitchen screen without refreshing, move
it through prep stages, and see the customer's status page update live — with an honest promise
time that degrades safely.

## 2. Assumptions (labelled; carried into the TDD)

| ID | Assumption | Why |
|----|-----------|-----|
| A1 | A third role, `admin` (central menu team), owns the menu CMS; an `outlet_manager` role (per outlet) can override estimates and receives late alerts. | Brief lists marketing team and managers as users; the core build names only customer and kitchen staff, but someone must own the menu and the override rule needs a manager. |
| A2 | "Prices by city" implies more than one city. Seed: 11 outlets + 3 cloud kitchens in Hyderabad, 3 outlets in Bengaluru (17 total). Bengaluru prices ~8% higher. | Brief gives 14 + 3 and "prices by city" but no city list. |
| A3 | The "promised time" is delivery-to-door. Kitchen "ready by" = promise − travel minutes. | Sample promises are 40–50 min after placement, consistent with prep + travel. |
| A4 | "The outlet's minimum" is a per-outlet minimum promise in minutes (default 35). | Brief: "promised time is the higher of the AI estimate and the outlet's minimum". |
| A5 | Delivery is done by a partner; we simulate it: after rider handoff, a mock partner marks the order delivered after the travel time. | Rider app is out of scope, but the late rule needs a delivery event. |
| A6 | Distance is straight-line (haversine) from a chosen area or browser geolocation; travel time = 4 min/km + 6 min, capped. No paid maps API. | Mock outside systems. |
| A7 | Menu prices are stored GST-inclusive; GST shown = price × 5/105. | "Prices include 5% GST and must say so." |
| A8 | Customers sign in with email + password (decision). Phone is collected at checkout for delivery and transactional messages. | Decision in brainstorming. |
| A9 | Order status messages (WhatsApp/SMS) are transactional and need no marketing opt-in; marketing messages require opt-in with a timestamp. Messages are written to an outbox table, not sent. | DPDP Act 2023; mock messages. |
| A10 | Prep-time training data is generated: ~6 weeks of synthetic history per outlet from a documented generating process with noise. | No historical data in brief. |
| A11 | Item photos are Unsplash-licensed images referenced by URL; admins can upload replacements to Supabase Storage. | No assets in brief. |
| A12 | All times are IST (Asia/Kolkata). The demo seed re-bases the three sample orders to "now", keeping their placed→promised gaps and statuses. | Sample data uses 20:14–21:16 wall-clock times. |
| A13 | Unpaid orders expire after 15 minutes and never reach the kitchen. | Mock payments; avoids phantom tickets. |

## 3. Architecture

**Approach A (chosen):** one Next.js 16 (App Router, TypeScript) app deployed as a Render web
service; Supabase provides Postgres, Auth, Realtime and Storage; `pg_cron` runs periodic jobs inside
Postgres.

```
Customer phone ─┐                             ┌─ Supabase Postgres (RLS)
Kitchen tablet ─┼─ HTTPS ─ Next.js on Render ─┤   orders, menu, events, estimates, outbox
Admin laptop  ──┘   (Server Actions,          │   pg_cron: late check, expiry, mock delivery
                     route handlers)          ├─ Supabase Auth (email+password, roles in profiles)
        ▲                                     └─ Supabase Realtime (postgres_changes)
        └──────── websocket (RLS-filtered) ───────┘
```

- **Business logic lives in `src/domain/*` as pure TypeScript** (pricing, coupons, geo, schedules,
  status machine, promise, prep model). Server Actions are thin: authenticate → validate (Zod) →
  call domain → write via Supabase. This keeps the logic unit-testable and the interview story clear.
- **Server is the source of truth for money and time.** On order placement the server re-reads
  prices, availability, schedule and coupon, and computes the estimate; client totals are ignored.
- **Real-time as acceleration, not truth.** KDS subscribes to `orders` changes filtered by
  `outlet_id`; customer status page subscribes to their order id. Both also refetch on reconnect,
  on `visibilitychange`, and every 20 s. A visible Live / Reconnecting pill shows channel state.
- **Status transitions are validated server-side** by a state machine and a conditional update
  (`where status = expected`) so two tablets cannot double-advance or regress an order.
- **Periodic jobs (pg_cron, every minute):** expire unpaid orders (A13); mock-deliver handed orders
  (A5); raise late alerts (§6).
- **Load:** 1,200 orders/hour peak ≈ 20/minute across outlets — small for Postgres and Realtime.
  Indexes on `(outlet_id, status)` and `(customer_id, placed_at)`; KDS queries only open orders.

Rejected: (B) separate API + SPA — two deploys, more glue, no gain at this scale; (C) Supabase Edge
Functions for logic — splits logic across runtimes, harder to test.

## 4. Roles and access

| Role | Can | Bound to |
|------|-----|----------|
| customer | browse, order, pay, view own orders | self |
| kitchen_staff | view/advance own outlet's orders, toggle item stock at own outlet | one outlet |
| outlet_manager | kitchen_staff + override promise, acknowledge alerts | one outlet |
| admin | menu CMS, all outlets read, message outbox | — |

Enforced twice: route-group guards in Next.js middleware/layouts, and Postgres RLS policies keyed on
`profiles.role` and `profiles.outlet_id`. The service-role key is used only in server code for
system jobs and seeding.

## 5. Data model

Money in integer paise. Timestamps `timestamptz`.

- `cities(id, name, slug)`
- `outlets(id, city_id, name, slug, kind['outlet'|'cloud_kitchen'], area, lat, lng,
  delivery_radius_km, fssai_licence, min_promise_minutes, capacity_slots, is_accepting_orders,
  opens_at, closes_at)`
- `profiles(id → auth.users, role, outlet_id?, full_name, phone?, marketing_opt_in, marketing_opt_in_at?)`
- `categories(id, name, sort)`
- `menu_items(id, category_id, name, description, photo_url, diet['veg'|'non_veg'|'egg'],
  spice_level 0–3, allergens text[], base_prep_minutes, is_active, sort)`
- `item_portions(id, item_id, name, prep_multiplier, sort)`
- `item_prices(portion_id, city_id, price_paise)` — PK (portion_id, city_id)
- `addons(id, item_id, name, price_paise, diet)`
- `outlet_item_availability(outlet_id, item_id, status['available'|'out_of_stock'|'hidden'],
  updated_by, updated_at)` — missing row = available
- `menu_schedules(id, name, days int[], starts_at time, ends_at time)`;
  `menu_items.schedule_id?` — null = all day
- `coupons(code PK, kind['percent'|'flat'], value, min_order_paise, max_discount_paise?,
  valid_from, valid_to, per_customer_limit, is_active)`
- `orders(id 'WEB-nnnnnn', customer_id, outlet_id, status, subtotal_paise, discount_paise,
  total_paise, gst_paise, coupon_code?, payment_method, payment_status, distance_km, travel_minutes, placed_at, paid_at?, promised_at, ready_by,
  preparing_at?, ready_at?, handed_at?, delivered_at?, cancelled_at?, cancel_reason?, late_alerted_at?,
  revised_eta?)`
- `order_contacts(order_id, customer_phone, delivery_address)` — personal data split out of `orders`
  so it is never in the Realtime-published table and only the owning customer can read it (DPDP)
- `order_items(id, order_id, item_id, portion_id, name_snapshot, portion_snapshot, qty,
  unit_price_paise, addons jsonb)`
- `order_events(id, order_id, from_status, to_status, actor_id?, at)`
- `payments(id, order_id, method['upi'|'card'], status['pending'|'succeeded'|'failed'|'expired'],
  amount_paise, provider_ref, created_at, updated_at)`
- `prep_models(version, coefficients jsonb, residual_p80, residual_p50, train_n, mae, baseline_mean_mae,
  baseline_rule_mae, outlet_train_counts jsonb, feature_ranges jsonb, trained_at, is_active)`
- `prep_estimates(order_id PK, model_version, features jsonb, predicted_minutes, p80_minutes,
  confidence['normal'|'low'], outlet_min_minutes, source['model'|'outlet_minimum'|'manager_override'|'fallback'],
  promised_at, override_reason?, overridden_by?, actual_minutes?)`
- `alerts(id, outlet_id, order_id, kind['late'], message, created_at, acknowledged_by?, acknowledged_at?)`
- `outbox_messages(id, channel['whatsapp'|'sms'], to_phone, purpose['transactional'|'marketing'],
  template, body, order_id?, created_at)`

**Order status machine:**
`awaiting_payment → placed → preparing → ready → handed_to_rider → delivered`;
`awaiting_payment → expired`; `placed|preparing → cancelled` (staff, with reason).
"Late by N min" is derived for display, not a status.

## 6. Prep-time estimate (the AI part)

**Features** (computed at placement, stored in `prep_estimates.features`):
1. `workload` = Σ qty × portion.prep_multiplier × item.base_prep_minutes
2. `critical_item` = max over lines of item.base_prep_minutes × portion multiplier
3. `queue_load` = remaining workload of open orders (placed + preparing) at the outlet ÷ capacity_slots
4. `peak` = 1 on Fri/Sun 19:00–23:00 IST, else 0

**Model:** ridge regression `prep = b0 + b1·workload + b2·critical_item + b3·queue_load + b4·peak`,
fitted by closed-form normal equations in TypeScript (no ML dependency). Residual P50/P80 from
held-out data. Stored versioned in `prep_models`; `pnpm train:prep` refits from
`order_events`-derived actuals (synthetic history at first, real orders later). Training reports MAE
on a 20% hold-out vs the baseline "always quote the outlet minimum".

**Promise:**
`ai_total = p80_prep + travel_minutes` (p80_prep = prediction + residual_p80)
`promise_minutes = max(ai_total, outlet.min_promise_minutes)` → `promised_at = paid_at + promise_minutes`
`ready_by = promised_at − travel_minutes`. `source` records which term won.

**When unsure:** confidence = `low` if any feature is outside the training range (> p95 seen) or the
outlet has < 200 training orders. Low confidence widens the range (uses 1.5 × residual_p80) and the
KDS card shows a "low confidence" tag. If the model row is missing/corrupt, fall back to a documented
heuristic (`critical_item + 2·queue_load + 10`) and mark `source = fallback` — ordering never fails
because of the model.

**When wrong:**
- Floor at the outlet minimum (above).
- Manager override on the KDS: set new promise (+5/+10/+15 or custom) with a reason; logged in
  `prep_estimates` (`source = manager_override`) and an outbox message tells the customer.
- Late rule (pg_cron, each minute): order not delivered and `now > promised_at + 10 min` and
  `late_alerted_at is null` → insert `alerts` row (KDS banner + SMS to outlet manager in outbox), send
  customer a WhatsApp update with a revised ETA, set `late_alerted_at`. Exactly once per order.
- Every estimate stores `actual_minutes` when the order hits `ready`, for monitoring and retraining.

Why not an LLM: a numeric prediction from four structured features is a regression problem; an LLM
would be slower, cost per order, be non-deterministic and hard to evaluate.

## 7. Screens

1. **Sign in** — email + password; one-tap demo buttons (Customer, Kitchen Kondapur, Manager
   Kondapur, Admin).
2. **Home / outlet picker** — choose area or "use my location" → matched outlet card (distance,
   ETA, FSSAI no.); out-of-radius empty state with nearest outlet.
3. **Menu** — hero food photos, short scannable list, sticky category tabs, veg/non-veg marks, spice,
   allergens, "Prices include 5% GST"; out-of-stock and off-schedule items shown disabled with reason;
   bottom-sheet item picker (portion, add-ons, qty); sticky cart bar.
4. **Cart & checkout** — single screen: address + phone, coupon, price breakdown with GST line, live
   promise ("Arrives by 9:02 pm"), pay button. Target < 60 s from menu to paid.
5. **Mock payment** — UPI (VPA or QR mock) / card (test card), Succeed / Fail / Time out controls.
6. **Order status** — live timeline, promised time, late notice with revised ETA.
7. **Kitchen display** — dark, high-contrast, landscape, readable at 2 m; columns New / Preparing /
   Ready / Handed; timers; neutral → amber (≤ 5 min to ready_by) → red (late); Live pill; chime on new
   order; manager alert banner; stock toggles drawer; manager override sheet.
8. **Menu admin** — item list with search/filters; item editor (photo upload, diet, spice, allergens,
   portions × city prices, outlet availability, schedule, base prep).

Utility: **Message outbox** (admin) showing mocked WhatsApp/SMS; **Demo tools** (admin): reset demo
data to now, simulate a dinner rush at an outlet (to show load-aware estimates and live KDS).

States everywhere: loading skeletons, empty states with a next action, inline error states with retry.
Visual system is set with the impeccable skill before screens are built.

## 8. Error handling

- Zod validation on every Server Action and route handler; typed `Result` errors mapped to friendly
  messages.
- Order placement re-checks availability; if an item went out of stock between cart and pay, the
  checkout shows exactly which line and offers removal.
- Payment failure keeps the order in `awaiting_payment` with retry; timeout → expired after 15 min.
- KDS action conflicts (status already moved) show a toast and refetch.
- Realtime disconnect → Reconnecting pill + polling fallback.

## 9. Testing

- **Vitest unit:** pricing & GST, coupons, haversine + outlet matching, schedules, status machine,
  prep features, ridge fit/predict, promise (floor, P80, low confidence, fallback), late rule.
- **RLS tests** against local Supabase: kitchen staff of outlet X cannot read outlet Y; customer cannot
  read another customer's order; customer cannot update order status.
- **Playwright E2E:** customer orders + pays → order appears on KDS without reload → kitchen advances
  → customer status updates live; out-of-radius state; payment failure + retry.

## 10. Security

No secrets in the repo (`.env.example` only; gitleaks in CI), Zod on all inputs, RLS + route guards,
service key server-only, security headers, simple in-memory rate limit on sign-in and order placement,
no PII in URLs or logs.

## 11. Deployment

Local: `supabase start` (Docker) + `pnpm dev`; `pnpm db:reset` applies migrations and seed.
Hosted: a dedicated Supabase project (migrations via `supabase db push`, seed via script) and a Render
web service built from the GitHub repo. Env vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `DEMO_MODE`.

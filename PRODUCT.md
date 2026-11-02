# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customers (mobile, primary).** Hyderabad diners ordering biryani and Hyderabadi food for delivery, today mostly through delivery apps. They want to pick a dish, see an honest arrival time and pay in under a minute.
- **Kitchen staff (outlet tablet).** Cooks and packers at one of 14 outlets or 3 cloud kitchens, working from a cheap Android tablet in a hot, noisy kitchen, often glancing from two metres away with wet or gloved hands.
- **Outlet managers.** Watch late orders, override promise times, pause items that run out.
- **Central menu team (desktop).** Owns one menu: items, photos, prices by city, outlet availability, time-based menus.
- The founder-CEO signs the deal and judges whether it beats the apps.

## Product Purpose

Company A's own direct-ordering channel, so orders stop paying the apps 25–30% and the brand owns its customer relationships. Success: direct orders reach 12% of app orders within 9 months; median checkout under 60 seconds; 35% of direct customers reorder within a month by month 6.

## Positioning

The only place an order goes straight from the customer to the right outlet's kitchen screen, priced from one menu Company A controls, with a promise time computed from that kitchen's real load instead of a generic estimate.

## Operating Context

- Friday and Sunday dinner peaks reach 1,200 orders an hour across outlets.
- Kitchens today work from printed tickets; the kitchen display replaces them.
- Riders come from a delivery partner (out of scope). Payments, WhatsApp/SMS and delivery are mocked in this build.

## Capabilities and Constraints

- Every outlet surface shows its FSSAI licence number; every item shows veg / non-veg / egg marks, spice level and allergens.
- Prices include 5% GST and must say so.
- Customer data is personal data under the DPDP Act 2023; marketing messages need opt-in.
- Kitchen screen must be readable from two metres, with colour marking late orders.
- Core build only: ordering app (menu, cart, test payment, live status), central menu admin, outlet kitchen display. Loyalty, party orders and the dashboard are out of this build.

## Brand Commitments

- The brand is shown as **Company A**, exactly as the brief names it. No logo, palette or typeface was supplied.
- The client values good, minimal design: clean layouts, white space, a restrained palette and clear type, with nothing on screen that lacks a purpose. Design counts as much as features.
- The menu should make people hungry: big food photos, a short scannable menu, easy-to-read prices.

## Evidence on Hand

- Three sample orders from the brief (WEB-778120 Kondapur ₹1,180; WEB-778131 Gachibowli cloud kitchen ₹640; WEB-778146 Kukatpally ₹1,050). Everything else in the seed is labelled synthetic.
- No testimonials, ratings, press or real photography exist; do not fabricate them. Food photos are Unsplash-licensed stand-ins.

## Product Principles

1. Honest time over fast-looking time: show a promise the kitchen can keep.
2. Fewer, better choices: a short menu and a one-screen checkout beat breadth.
3. The kitchen screen is a tool, not a page: legible at a glance, one obvious action per card.
4. Own the customer, respect the customer: collect only what an order needs; opt-in for anything else.

## Accessibility & Inclusion

WCAG 2.2 AA. Diet marks and late states never rely on colour alone. Kitchen tap targets at least 64px; customer targets at least 44px.

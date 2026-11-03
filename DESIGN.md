---
name: Company A
description: Direct ordering from a chef's open kitchen at night; your ticket goes up on the outlet's rail.
colors:
  slate: "#141312"
  slate-surface: "#1c1b19"
  steel: "#24231f"
  steel-seam: "#35332e"
  warm-white: "#f2eee6"
  ash: "#a39c91"
  brass: "#b08d57"
  brass-lit: "#c9a46a"
  ember-danger: "#e0705f"
  ok-text-night: "#7cc394"
  risk-text-night: "#e0a526"
  late-text-night: "#e0705f"
  kitchen-slate: "#0f0e0d"
  kitchen-surface: "#1a1917"
  ledger-paper: "#f4f1ea"
  ledger-surface: "#fbf9f4"
  ledger-raised: "#ffffff"
  ledger-seam: "#ddd7cb"
  ledger-ink: "#161514"
  ledger-ink-muted: "#5e5a52"
  brass-deep: "#6e5226"
  brass-deep-pressed: "#5a421d"
  ledger-danger: "#a5352a"
  ok-text-day: "#2b6a41"
  risk-text-day: "#855404"
  late-text-day: "#a5352a"
  ticket-paper: "#f4f1ea"
  ticket-seam: "#ddd7cb"
  ticket-ink: "#161514"
  ticket-ink-muted: "#5e5a52"
  ticket-band-steel: "#34312b"
  rail-steel: "#3d3b36"
  signal-ok: "#3f8f5a"
  signal-risk: "#c98a12"
  signal-late: "#b3392c"
  fssai-veg: "#1f8a4c"
  fssai-nonveg: "#7a3b1d"
typography:
  display-hero:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "clamp(2.75rem, 9vw, 5.75rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  display:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "clamp(2.5rem, 8vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"ss01\""
  body-strong:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.4
  meta:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  plate-label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.14em"
  figures:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontFeature: "\"tnum\""
  kitchen-order-id:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
rounded:
  control: "8px"
  button-lg: "12px"
  photo-sm: "12px"
  photo-feature: "16px"
  ticket: "6px"
  sheet: "22px"
  pill: "9999px"
spacing:
  gutter: "20px"
  row: "16px"
  section: "48px"
  stack-sm: "6px"
  stack-md: "12px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.slate}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brass-lit}"
  button-primary-lg:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.slate}"
    rounded: "{rounded.button-lg}"
    padding: "0 24px"
    height: "52px"
  button-secondary:
    textColor: "{colors.warm-white}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.steel}"
  button-kitchen-action:
    backgroundColor: "{colors.ticket-ink}"
    textColor: "{colors.ticket-paper}"
    rounded: "{rounded.button-lg}"
    padding: "0 28px"
    height: "64px"
  field:
    backgroundColor: "{colors.slate-surface}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  segmented-selected:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.slate}"
    rounded: "{rounded.control}"
    height: "44px"
  stepper-button:
    textColor: "{colors.warm-white}"
    rounded: "{rounded.control}"
    size: "44px"
  badge:
    textColor: "{colors.ash}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  live-pill:
    textColor: "{colors.ok-text-night}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  sheet:
    backgroundColor: "{colors.slate-surface}"
    rounded: "{rounded.sheet}"
    width: "min(32rem, calc(100vw - 2rem))"
  ticket:
    backgroundColor: "{colors.ticket-paper}"
    textColor: "{colors.ticket-ink}"
    rounded: "{rounded.ticket}"
  ticket-band-on-time:
    backgroundColor: "{colors.ticket-band-steel}"
    textColor: "{colors.ticket-paper}"
    padding: "10px 16px"
  ticket-band-at-risk:
    backgroundColor: "{colors.signal-risk}"
    textColor: "{colors.ticket-ink}"
    padding: "10px 16px"
  ticket-band-late:
    backgroundColor: "{colors.signal-late}"
    textColor: "#ffffff"
    padding: "10px 16px"
  menu-row-photo:
    rounded: "{rounded.photo-sm}"
    size: "80px"
---

# Design System: Company A

## Overview

**Creative North Star: "The Pass at Night"**

Company A is a chef's open kitchen after dark. The customer stands at the pass: slate and steel surfaces joined by 1px seams, warm white type, food lit in full colour against the dark, and exactly one brass control that says what to do next. When the order is paid it becomes a paper ticket, the same object the cooks read, and clips onto that outlet's steel rail. The kitchen display is the same world seen from the line: darker slate, paper tickets hanging in four columns, a steel, amber or red band across each ticket's head that tells urgency from two metres away. Admin is the same company's daytime office: a paper ledger, ink type, deep brass for its one primary action. Three themes, one material vocabulary (slate, steel, paper, ink, brass) and one pair of typefaces. The build refuses the orange delivery-app card grid: menus are rows and one featured plate per category, not tiles.

**Key Characteristics:**
- Dark, warm-neutral customer surfaces; tonal layering by seams, not shadows.
- One brass action per view; everything else is warm white, ash or outline.
- Paper tickets are the signature object, shared by the order status screen and the kitchen board.
- Gloock for dish names, headlines and the arrival time; Hanken Grotesk with tabular figures for everything operational.
- Untinted food photography is the only colour field on customer screens.
- One authored moment per surface (ticket drop); every other transition is 150–220 ms ease-out-expo.

## Colors

A warm-neutral night palette (slate, steel, warm white) with a single brass accent, a paper-and-ink ticket material shared across themes, and amber and red kept for time pressure.

### Primary
- **Pass Brass** (brass; brass-lit on hover): the single live action on a customer view: "See the menu", "Add to order", "Pay", "Order again". Also the focus ring (brass-lit, 2px, 3px offset), text caret, selection tint, the completed steps of the order-status line, and the ring on a freshly dropped kitchen ticket. Text on brass is slate (on-accent).
- **Ledger Brass** (brass-deep; brass-deep-pressed on hover): the admin theme's re-declaration of the accent, darkened so brass stays an AA fill and text colour on paper. Text on it is ledger-surface.

### Secondary: ticket material
- **Ticket Paper** (ticket-paper) with **Ticket Ink** (ticket-ink) and **Ink Muted** (ticket-ink-muted): the paper ticket in every theme. Tickets are fixed colours, not themed: a ticket looks the same on the customer's night screen as on the kitchen rail.
- **Ticket Seam** (ticket-seam): the rule above ticket actions and the dashed tear line above the paid total.
- **Band Steel** (ticket-band-steel): the on-time header band on a ticket, carrying the order number in paper.
- **Rail Steel** (rail-steel): the 4px rail the customer's ticket hangs from on the status screen.

### Tertiary: urgency and status signals
- **Signal OK / Risk / Late** (signal-ok, signal-risk, signal-late): fills, dots and borders only. Risk and late fill the kitchen ticket band; OK lights the live dot. These are not text colours on dark or paper grounds.
- **Status text** (ok-text-night, risk-text-night, late-text-night on night themes; ok-text-day, risk-text-day, late-text-day on paper): the readable text version of each signal, exposed as `--ok-text`, `--risk-text`, `--late-text` and re-declared per theme. LivePill, Badge tones, the stock drawer and the kitchen late-alert icon all set their words in these.
- **FSSAI marks** (fssai-veg, fssai-nonveg): only inside DietMark, on a white square. Never used as UI colour.

### Neutral
- **Pass Slate** (slate): customer page ground. **Kitchen Slate** (kitchen-slate) and **Kitchen Surface** (kitchen-surface): the kitchen theme, one step darker so paper tickets carry the board.
- **Slate Surface** (slate-surface): sheets, fields, error panels, photo wells.
- **Steel** (steel): raised and hover fill, rows on hover, skeleton highlight.
- **Steel Seam** (steel-seam): 1px borders: row dividers, header rules, control outlines, scrollbar thumb.
- **Warm White** (warm-white): primary text, selected segmented option and selected category tab fill.
- **Ash** (ash): secondary text, hints, meta lines.
- **Ember** (ember-danger): destructive and error text on night themes.
- **Ledger** set (ledger-paper, ledger-surface, ledger-raised, ledger-seam, ledger-ink, ledger-ink-muted, ledger-danger): the admin theme's paper office.

### Theme mechanics
Themes are scopes, not pages. `:root` is the customer night theme; `[data-theme="paper"]` wraps admin; `[data-theme="kitchen"]` wraps the kitchen board (it inherits the night text and accent roles and overrides only the grounds). Each scope declares raw role variables (`--bg`, `--surface`, `--raised`, `--seam`, `--fg`, `--muted`, `--accent`, `--accent-strong`, `--on-accent`, `--danger`, `--ok-text`, `--risk-text`, `--late-text`). Tailwind's `@theme inline` maps `--color-*` to those roles, but a custom property that references another is resolved where it is declared, so `--color-bg: var(--bg)` declared on `:root` would freeze to the night value inside an admin subtree. Every `[data-theme]` scope therefore re-declares the `--color-*` role tokens, so nested themes (the paper admin, the kitchen board, the kitchen sample inside the UI kit page) re-skin their whole subtree.

### Named Rules
**The One Brass Rule.** Brass fills exactly one control per view: the next step. Secondary actions are outline or ghost in warm white; selection uses warm white, never brass. If a second brass fill appears, one of them is wrong.

**The Signal Is Not Text Rule.** Signal colours fill bands, dots and borders. Words that carry status use `--ok-text`, `--risk-text`, `--late-text` for the current theme, which are tuned for AA on that theme's ground.

**The Fixed Paper Rule.** Ticket paper and ink are the same in every theme. Do not theme a ticket.

## Typography

**Display Font:** Gloock (with ui-serif, Georgia)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui), stylistic set 01 on, tabular figures for every number

**Character:** A high-contrast, slightly theatrical serif for the things you would read off a chalkboard (dish names, the kitchen's name, the time your food arrives) against a plain working grotesk for everything you operate.

### Hierarchy
- **Display Hero** (400, clamp(2.75rem, 9vw, 5.75rem), 0.98): the home dish line over the photograph. Once per product.
- **Display** (400, clamp(2.5rem, 8vw, 4.5rem), 0.98, -0.02em): the order-status headline ("Arrives by 8:40 pm"), menu outlet name, other single-page heroes.
- **Headline** (400, 2.25rem, Gloock): screen titles in checkout, admin and pay; the promised time on checkout.
- **Title** (400, 1.5rem, Gloock): sheet titles, featured dish names, empty-state titles. Kitchen outlet name is 2rem.
- **Body** (400, 1rem, 1.5): descriptions capped at 46–52ch. Body Strong (600, 1.0625rem) names dishes in menu rows.
- **Meta** (400, 0.875rem, ash): addresses, timestamps, hints, allergens (0.8125rem in rows).
- **Plate Label** (600, 0.6875rem, 0.14em tracking, uppercase, ash): engraved station-plate labels. It names a section ("Your order", "Delivery", "Pay with") or a field over its value ("Arrives by"). The wordmark "COMPANY A" is set in the same spaced-caps voice.
- **Figures** (600, tabular): prices, quantities, clocks, timers, order numbers, column counts.

### Named Rules
**The Chalkboard Rule.** Gloock is for names and times a person reads once and remembers. Buttons, forms, tables, numbers and kitchen ticket bodies are Hanken Grotesk.

**The Tabular Rule.** Every number that changes or lines up (price, qty, time, count, order id) is tabular.

**The Plate Rule.** A plate label is a section heading or a field label. It never sits above a headline as a kicker.

## Layout

Customer pages sit in a centred column (header max 72rem, content max 64rem or narrower, 20px gutters). The order status screen is two columns from 1024px: the stage line on the left and the paper ticket on a 22rem rail on the right; on phones the ticket follows the stages. The home hero is full-bleed photography with type and the outlet card at the left. Menus are single-column lists: one featured plate per category (4:3 photo, 16px corners) followed by rows (80px thumbnail, 16px vertical padding, 1px seam between rows), with a horizontally scrolling category tab strip under the outlet header. Sheets are bottom sheets on phones (max 92dvh) and centred 32rem panels from 640px. The kitchen board is a header strip over four equal columns (New, Preparing, Ready for pickup, With rider), each headed by a name and count over a steel rule, tickets stacked beneath. Admin is a ledger table on paper inside the same 72rem frame.

Rhythm: 6px and 12px stacks inside components, 16px row padding, 20px page gutters, 48px between major blocks on status and checkout.

## Elevation & Depth

Night and paper themes are flat: depth comes from tonal steps (slate, slate-surface, steel) and 1px seams. The one shadow belongs to the ticket, because a ticket is a physical slip hanging off a rail.

### Shadow Vocabulary
- **Hanging ticket** (`box-shadow: 0 22px 40px -22px rgba(0,0,0,0.9)`): paper tickets on the kitchen board and the status screen only.
- **Sheet overlay** (`background: rgb(0 0 0 / 0.65)`): behind every Sheet.

### Named Rules
**The Seam Not Shadow Rule.** Panels, rows, fields and cards separate by 1px seams and tonal steps. Only tickets cast a shadow.

## Shapes

Gently rounded working controls (8px for 44px controls and fields, 12px for 52px and 64px buttons, stepper and segmented frames), softer photo corners (12px thumbnails, 16px featured plates), a tight 6px corner on paper tickets so they read as cut paper, and a 22px top corner on sheets. Pills (full radius) are reserved for status: LivePill, Badge, availability notes over photos, the add button on featured plates, selected category tabs. Diet marks are squares with 2px corners.

## Components

### Buttons
- **Shape:** 8px at 44px tall (md), 12px at 52px (lg) and 64px (xl, kitchen).
- **Primary:** brass fill, slate text, 600 weight; hover to brass-lit. One per view.
- **Secondary:** 1px seam outline, warm white text; hover lifts the border to ash and fills steel.
- **Ghost:** text only; hover fills steel. **Danger:** ember outline at 60% and ember text; hover adds a 10% ember wash.
- **States:** press scales to 0.98; disabled drops to 45% opacity and ignores pointer; loading shows a spinning loader glyph, sets `aria-busy`, and disables. Transitions are 150ms.
- **Kitchen action:** xl size, full ticket width, ink fill with paper text: the live action on a ticket is the ticket's own ink, not brass.

### Fields
- **Style:** slate-surface fill, 1px seam, 8px corners, 12px by 14px padding, label above in 500 weight, hint or error below.
- **Hover / Focus:** border to ash on hover, to brass on focus. **Error:** ember border, message announced with `role="alert"` and tied by `aria-describedby`.

### Segmented and Category Tabs
- Radio group in a seam-outlined 12px frame with 4px inset; options are 44px minimum. Selected option is filled warm white with slate text (warm white ink on paper); unselected is ash, warm white on hover. Category tabs use the same selected fill as a pill.

### Stepper
- Seam-outlined 12px group, two 44px icon buttons and a tabular count announced politely. Ends disable at 35% opacity.

### Badge and LivePill
- **Badge:** pill, 1px border at 50–70% of the tone, text in the tone's status-text token; tones neutral, accent, ok, risk, late.
- **LivePill:** pill with a dot and a word (Live, Reconnecting…, Offline), `role="status"`. The live dot pings (motion-safe). State is always spelled out, never dot-only.

### Sheet
- Radix dialog. Bottom sheet on phones with a 22px top corner and seam top edge; centred 22px panel from 640px. Sticky header with a Gloock title and a 44px close button. Bottom padding respects the safe area.

### DietMark and SpiceLevel
- **DietMark:** FSSAI-style mark, white square with a coloured border: veg is a green dot, non-veg and egg are a brown triangle. 16px in titles, 14px in rows; labelled for screen readers.
- **SpiceLevel:** one to three flame glyphs with an image label ("Spice: Medium"); nothing rendered at zero.

### Menu rows
- **Featured plate:** full-width 4:3 photo with 16px corners, a slow 1.03 scale on hover (700ms), Gloock title with DietMark, description clamped to two lines, price with "from", and a 44px round add button that takes brass on hover.
- **Row:** 80px photo, Body Strong name with DietMark, one-line description or availability note, tabular price; seam divider. The whole row is one button with a spoken label including price and availability.
- **Unavailable:** photo at 45% opacity and greyscale, note text in place of the description ("Sold out at this kitchen today").

### Skeleton, EmptyState, ErrorState
- **Skeleton:** slate-surface to steel gradient, shimmer only when motion is allowed.
- **EmptyState:** left-aligned Gloock title, ash body capped at 46ch, optional action.
- **ErrorState:** seam-outlined slate-surface panel, `role="alert"`, warning glyph in ember beside the title, secondary "Try again" button.

### Paper Ticket (signature)
- **Material:** ticket paper, ink type, 6px corners, the hanging-ticket shadow. Used on the kitchen board and as the customer's receipt on the status screen, clipped under a 4px rail-steel bar.
- **Head band:** order number left, status words right. On time is band steel with paper text; at risk is risk amber with ink text; late is late red with white text and reads "Late by N min". Status is always written in the band, so the colour is never the only signal.
- **Kitchen body:** item lines with bold tabular quantity, portion in 600, add-ons in ink muted; "N min in" timer; "Low confidence" and "Time adjusted" flags; a seam-ruled action area with the 64px ink action; Adjust time and Cancel order as underlined text actions. With-rider tickets collapse to the timer at 75% opacity.
- **Customer receipt:** item lines with prices, dashed tear line, discount, paid total with method, GST and FSSAI licence in ink muted.
- **New ticket:** drops in with the ticket-drop motion and a 4px brass ring for 1.2s.

### Order stage line
- Vertical list of five stages joined by a 1px line: completed nodes and connectors are brass with a check; the current node adds a 4px brass halo; future nodes are seam-outlined on slate. Each reached stage shows its time; the placed stage says how many tickets are ahead.

## Kitchen sizing floor

The kitchen board is read from two metres by people with their hands full. These are floors, not targets:
- **Body ≥ 24px:** every line a cook must read (item lines, status words, timers, flags) is at least 24px.
- **Order id ≥ 32px:** order numbers are 32px bold tabular.
- **Tap targets ≥ 64px:** every control on a ticket and on the board header is at least 64px tall.
- **Colour is never the only signal:** band colour always pairs with written status ("At risk", "Late by 6 min"); low confidence pairs an icon with words; live state pairs a dot with a word.

Sizes on kitchen surfaces are set in px-equivalent rem against the root, so the kitchen theme's inherited 1.5rem font size does not lift explicitly sized text; size kitchen text explicitly to the floor.

## Imagery

Food photography is the only saturated colour on customer screens and is shown untinted: no overlays in brand colour, no duotone, no filters, except the dark gradient that keeps hero type legible and the greyscale applied to unavailable dishes. Current photographs are Unsplash stand-ins credited on the surface ("Photo: … / Unsplash"); they are served through the custom next/image loader at `src/lib/image-loader.ts`, which asks Unsplash's CDN for the rendered width at quality 72, auto format, fit max, so the server never pulls originals. Uploaded menu photos from storage pass through unchanged. Product images carry empty alt where the dish name sits beside them.

## Motion

One authored moment per surface; everything else is quiet.
- **Ticket drop** (520ms, ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)`): from 28px above, rotated -1.2deg, blurred 2px and transparent, to rest. Plays when a paid order lands on the status screen and when a new ticket arrives on the kitchen board.
- **Shimmer** (1.6s linear, infinite): skeleton loading only.
- **Live ping:** the LivePill dot while connected.
- **State transitions:** 150–220ms, ease-out or ease-out-expo, on colour, border, opacity and the 0.98 press scale.
- **Reduced motion:** under `prefers-reduced-motion: reduce` every animation and transition collapses to 1ms and one iteration; ticket drop, shimmer and ping are also gated with `motion-safe`.

## Accessibility

- WCAG 2.2 AA is the bar in all three themes: status words use the per-theme status-text tokens; brass is darkened to brass-deep on paper.
- Focus is always visible: 2px brass-lit outline, 3px offset.
- Customer and admin targets are at least 44px; kitchen targets at least 64px.
- Diet marks differ by shape (dot versus triangle), not only colour, and carry an accessible name.
- Live regions: LivePill and Stepper announce politely; errors use `role="alert"`.
- Status is always words; colour reinforces it.

## Do's and Don'ts

### Do:
- **Do** give each view one brass action, and keep selection states in warm white.
- **Do** set status words in `--ok-text`, `--risk-text`, `--late-text` and keep signal colours for bands, dots and borders.
- **Do** re-declare the `--color-*` role tokens in any new `[data-theme]` scope.
- **Do** use the paper ticket for anything that represents an order, with its band, tabular id and written status.
- **Do** keep numbers tabular and dish names in Gloock.
- **Do** meet the kitchen floor: 24px body, 32px order id, 64px targets.
- **Do** show food photography untinted and route remote photos through the image loader.

### Don't:
- **Don't** build menus as a grid of cards; use featured plates and rows.
- **Don't** put brass on more than one control in a view, or use brass as decoration.
- **Don't** put a plate label above a headline as a kicker.
- **Don't** shadow anything but a ticket.
- **Don't** theme ticket paper, or recolour food photography.
- **Don't** signal state by colour alone.
- **Don't** add motion beyond the ticket drop without removing something; keep transitions within 150–220ms.

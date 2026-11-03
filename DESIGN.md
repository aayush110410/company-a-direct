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
  risk-on-paper: "#855404"
  ticket-paper: "#f4f1ea"
  ticket-seam: "#ddd7cb"
  ticket-ink: "#161514"
  ticket-ink-muted: "#5e5a52"
  ticket-band-steel: "#34312b"
  rail-steel: "#3d3a34"
  clip-steel: "#5b574e"
  signal-ok: "#3f8f5a"
  signal-risk: "#c98a12"
  signal-late: "#b3392c"
  fssai-veg: "#1f8a4c"
  fssai-nonveg: "#7a3b1d"
typography:
  display-hero:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "clamp(2.5rem, 9vw, 5.75rem)"
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
  section-title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"ss01\""
  meta:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  wordmark:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.32em"
  figures:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontFeature: "\"tnum\""
  kitchen-order-id:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  kitchen-item:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.375
  kitchen-meta:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
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
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  sheet:
    backgroundColor: "{colors.slate-surface}"
    rounded: "{rounded.sheet}"
    width: "min(32rem, calc(100vw - 2rem))"
  cart-bar:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.slate}"
    padding: "0 20px"
    height: "64px"
  ticket:
    backgroundColor: "{colors.ticket-paper}"
    textColor: "{colors.ticket-ink}"
    rounded: "{rounded.ticket}"
  ticket-band-on-time:
    backgroundColor: "{colors.ticket-band-steel}"
    textColor: "{colors.ticket-paper}"
    padding: "12px 16px"
  ticket-band-at-risk:
    backgroundColor: "{colors.signal-risk}"
    textColor: "{colors.ticket-ink}"
    padding: "12px 16px"
  ticket-band-late:
    backgroundColor: "{colors.signal-late}"
    textColor: "#ffffff"
    padding: "12px 16px"
  rail:
    backgroundColor: "{colors.rail-steel}"
    rounded: "{rounded.pill}"
    height: "10px"
  ticket-clip:
    backgroundColor: "{colors.clip-steel}"
    size: "48px x 16px"
  mini-ticket:
    backgroundColor: "{colors.ticket-paper}"
    rounded: "{rounded.ticket}"
    size: "44px x 56px"
  menu-row-photo:
    rounded: "{rounded.photo-sm}"
    size: "80px"
---

# Design System: Company A

## Overview

**Creative North Star: "The Pass at Night"**

Company A is a chef's open kitchen after dark. The customer stands at the pass: slate and steel surfaces joined by 1px seams, warm white type, food lit in full colour against the dark, and exactly one brass control that says what to do next. Once paid, the order is a paper ticket hanging on that outlet's steel rail, the same paper ticket component the cooks read. On the customer's status page the rail shows the queue ahead as small anonymous tickets with the customer's own ringed in brass, and the full receipt sits below it. The kitchen display is the same world seen from the line: darker slate, four columns, each with its own rail and tickets hanging from it, a steel, amber or red band across each ticket's head that tells urgency from two metres away. Admin is the same company's daytime office: a paper ledger, ink type, deep brass for its one primary action.

Three themes, one material vocabulary (slate, steel, paper, ink, brass) and one pair of typefaces. The build refuses the orange delivery-app card grid: menus are rows and one featured plate per category, not tiles. Headings are plain sentence case; there are no uppercase eyebrows anywhere in the product. The only spaced capitals are the "COMPANY A" wordmark.

**Key Characteristics:**
- Dark, warm-neutral customer surfaces; tonal layering by seams, not shadows.
- One brass action per view; everything else is warm white, ash or outline.
- Paper tickets on a steel rail are the signature object, shared by the status page and the kitchen board.
- Gloock for dish names, headlines and the arrival time; Hanken Grotesk with tabular figures for everything operational.
- Untinted food photography is the only colour field on customer screens.
- One authored moment per surface (ticket drop); every other transition is 150–220 ms.

## Colors

A warm-neutral night palette (slate, steel, warm white) with a single brass accent, a fixed paper-and-ink ticket material shared across themes, and amber and red kept for time pressure.

### Primary
- **Pass Brass** (brass; brass-lit on hover): the single live action on a customer view: "See the menu", the cart bar, "Add to order", "Pay", "Order again". Also the focus ring (brass-lit, 2px, 3px offset), text caret, selection tint, completed steps of the order-status line, the ring and clip on the customer's own mini ticket, and the ring on a freshly dropped kitchen ticket. Text on brass is slate.
- **Ledger Brass** (brass-deep; brass-deep-pressed on hover): the admin theme's re-declaration of the accent, darkened so brass stays an AA fill and text colour on paper.

### Secondary: ticket and rail material
- **Ticket Paper** (ticket-paper) with **Ticket Ink** (ticket-ink) and **Ink Muted** (ticket-ink-muted): the paper ticket in every theme. Tickets are fixed colours, not themed.
- **Ticket Seam** (ticket-seam): the rule above ticket actions, ticket footer button outlines, and the dashed tear line above the paid total.
- **Band Steel** (ticket-band-steel): the on-time band at the head of every ticket, full and mini, carrying the number in paper. It is a literal, not a theme role, because the ticket is fixed material.
- **Rail Steel** (rail-steel): the 10px rail bar. **Clip Steel** (clip-steel): the clip that holds a ticket on the rail.
- **Risk On Paper** (risk-on-paper): amber words on a ticket ("Low confidence"), AA on paper in every theme.

### Tertiary: urgency and status signals
- **Signal OK / Risk / Late** (signal-ok, signal-risk, signal-late): fills, dots and borders only. Risk and late fill the ticket band and the LivePill dot when the connection degrades; late tints the kitchen alert strip.
- **Status text** (ok-text-night, risk-text-night, late-text-night on night themes; ok-text-day, risk-text-day, late-text-day on paper): readable text for each signal, exposed as `--ok-text`, `--risk-text`, `--late-text` and re-declared per theme. Badge tones, the LivePill's degraded states, the stock drawer, the admin "On menu" state and the late headline on the status page set words in these.
- **FSSAI marks** (fssai-veg, fssai-nonveg): only inside DietMark, on a white square.

### Neutral
- **Pass Slate** (slate): customer page ground and hero scrim. **Kitchen Slate** and **Kitchen Surface**: the kitchen theme's grounds, one step darker so paper carries the board.
- **Slate Surface** (slate-surface): sheets, fields, panels, the test-mode note, photo wells.
- **Steel** (steel): raised and hover fill, skeleton highlight.
- **Steel Seam** (steel-seam): 1px borders: row dividers, header rules, control outlines, the neutral LivePill outline.
- **Warm White** (warm-white): primary text, selection fills (segmented, category tabs, kitchen column tabs), the live dot and the "Track order" dot, money lines including the discount.
- **Ash** (ash): secondary text, hints, meta lines, rail captions.
- **Ember** (ember-danger): destructive and error text on night themes.
- **Ledger** set: the admin theme's paper office.

### Theme mechanics
`:root` is the customer night theme; `[data-theme="paper"]` wraps admin; `[data-theme="kitchen"]` wraps the board (it overrides only the grounds and sets a 1.5rem base size). Each scope declares raw role variables (`--bg`, `--surface`, `--raised`, `--seam`, `--fg`, `--muted`, `--accent`, `--accent-strong`, `--on-accent`, `--danger`, plus `--ok-text`, `--risk-text`, `--late-text`). Because a custom property that references another resolves where it is declared, every `[data-theme]` scope re-declares the `--color-*` role tokens so nested themes re-skin their whole subtree. Paper, ink, signals and FSSAI colours are fixed `--color-*` values and do not change per theme.

### Named Rules
**The One Brass Rule.** Brass fills exactly one control per view: the next step. Secondary actions are outline or ghost in warm white; selection uses warm white, never brass. If a second brass fill appears, one of them is wrong.

**The Signal Is Not Text Rule.** Signal colours fill bands, dots and borders. Words that carry status use the current theme's status-text token, or risk-on-paper on a ticket.

**The Quiet Live Rule.** A healthy state is warm white and still: the live dot does not pulse, the "Track order" dot is warm white, money lines are warm white. Colour arrives only when something needs attention.

## Typography

**Display Font:** Gloock (with ui-serif, Georgia)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui), stylistic set 01 on, tabular figures for every number

**Character:** A high-contrast, slightly theatrical serif for the things you would read off a chalkboard (dish names, the kitchen's name, the time your food arrives) against a plain working grotesk for everything you operate.

### Hierarchy
- **Display Hero**: the home dish line over the photograph, capped at 14ch. Once per product.
- **Display**: the order-status headline ("Arrives by 2:32 pm"). The menu outlet name and checkout title use near variants (up to 4.25rem and 3.5rem).
- **Headline** (Gloock 2.25rem): screen titles in pay, admin and empty pages.
- **Title** (Gloock 1.5rem): sheet titles, featured dish names, outlet name in cards. Kitchen outlet name is 2rem.
- **Section Title** (Hanken 650, 1.125rem, -0.01em, warm white, sentence case): the heading inside a screen: "Your order", "Delivery", "Pay with", "Your ticket on the Kondapur rail".
- **Body**: descriptions capped at 46–52ch; dish names in rows at 600.
- **Meta** (0.875rem, ash): addresses, timestamps, hints, rail captions.
- **Wordmark** (600, 0.8125rem, 0.32em tracking, uppercase): "COMPANY A" in the header, admin and auth bars. Nothing else is set in spaced capitals.
- **Figures** (600, tabular): prices, quantities, clocks, timers, order numbers, column counts.
- **Kitchen**: order number 2.25rem bold tabular in the band (customer ticket 1.5rem); band status 1.25rem semibold (customer 0.875rem); item lines 1.5rem; timer, flags, add-ons and footer actions 1.125rem; column heads 1.375rem.

### Named Rules
**The Chalkboard Rule.** Gloock is for names and times a person reads once and remembers. Buttons, forms, tables, numbers and ticket bodies are Hanken Grotesk.

**The Tabular Rule.** Every number that changes or lines up (price, qty, time, count, order id) is tabular.

**The No Kicker Rule.** A section is named by a sentence-case Section Title. Nothing sits above a heading to introduce it, and no label is set in small spaced capitals.

## Layout

Customer pages sit in a centred column (header 72rem, content 64rem or narrower, 20px gutters). The header is a 64px bar: wordmark left; "Track order" (when an order is in progress), cart and account right.

**Home hero.** Full viewport height on plain slate. On phones the photograph fills the top 40svh with a slate gradient into the ground and the headline starts at 30svh. From 640px the photograph moves right, starting at 45% of the width (50% from 1024px), with a left-edge slate scrim so the headline and outlet card sit on plain dark ground, not on the photograph.

**Status page.** Two columns from 1024px (stage line, then a 24rem aside), 48px apart; one column on phones with the aside after the stages. The aside is a Section Title, the rail with mini tickets and caption, then the full receipt 24px below.

**Menus** are single-column lists: one featured plate per category, then rows with 1px seams, under a horizontally scrolling category tab strip. The cart bar floats at the bottom, max 36rem. **Sheets** are bottom sheets on phones (max 92dvh) and centred 32rem panels from 640px.

**Kitchen board.** A header strip (outlet name in Gloock, clock, LivePill, Stock, staff), an optional late-alert strip, then four equal columns from 1024px (New, Preparing, Ready for pickup, With rider), each a name and count over its own rail. On portrait tablets a tab bar shows one column at a time. Tickets stack 20px apart under the rail.

Rhythm: 6px and 12px stacks inside components, 16px row padding, 20px page gutters and board gaps, 48px between major blocks.

## Elevation & Depth

Night and paper themes are flat: depth comes from tonal steps (slate, slate-surface, steel) and 1px seams. Shadows are reserved for physical objects that hang or float above the pass.

### Shadow Vocabulary
- **Hanging ticket** (`box-shadow: 0 22px 40px -22px rgba(0,0,0,0.9)`): full paper tickets on the board and the status page.
- **Floating cart bar** (`box-shadow: 0 18px 40px -12px rgba(0,0,0,0.7)`): the fixed brass cart bar on menus, which floats over scrolling content.
- **Rail underside** (`box-shadow: inset 0 -1px 0 rgba(0,0,0,0.4)`): a single dark line on the rail's lower edge; the rail is otherwise a flat bar.
- **Sheet overlay** (`background: rgb(0 0 0 / 0.65)`): behind every Sheet.

### Named Rules
**The Seam Not Shadow Rule.** Panels, rows, fields and cards separate by 1px seams and tonal steps. Only a ticket or a floating bar casts a shadow.

## Shapes

Gently rounded working controls (8px for 44px controls and fields, 12px for 52px and 64px buttons and control frames), softer photo corners (12px thumbnails, 16px featured plates), 16px on the cart bar, and a 22px top corner on sheets. Paper tickets have square tops, where the band meets the rail, and 6px bottom corners, so they read as cut paper. The rail is a fully rounded 10px bar; clips are small rounded-bottom tabs. Pills (full radius) are for status and small round actions: LivePill, Badge, availability notes, the featured-plate add button, selected category tabs. Diet marks are squares with 2px corners.

## Components

### Buttons
- **Shape:** 8px at 44px tall (md), 12px at 52px (lg) and 64px (xl, kitchen).
- **Primary:** brass fill, slate text, 600; hover to brass-lit. One per view.
- **Secondary:** 1px seam outline, warm white text; hover lifts the border to ash and fills steel.
- **Ghost:** text only; hover fills steel. **Danger:** ember outline at 60%, ember text; hover adds a 10% ember wash.
- **States:** press scales to 0.98; disabled 45% opacity; loading shows a spinning loader, sets `aria-busy`, disables. 150ms ease-out.
- **Kitchen action:** xl, full ticket width, ink fill with paper text: the live action on a ticket is the ticket's own ink, not brass.

### Cart bar
- Fixed to the bottom of menus, 64px tall, 16px corners, brass fill with slate text: item count and subtotal left, "View cart" right. It is the menu's one brass action.

### Fields
- Slate-surface fill, 1px seam, 8px corners, 12px by 14px padding, label above in 500, hint or error below. Border to ash on hover, brass on focus; error in ember with `role="alert"` tied by `aria-describedby`.

### Segmented, Category Tabs, Kitchen Column Tabs
- Radio group in a seam-outlined 12px frame on slate-surface with 4px inset; options at least 44px. Selected is warm white fill with slate text (ink on paper); unselected ash. Category tabs and the kitchen's portrait column tabs use the same warm white selection.

### Stepper
- Seam-outlined 12px group, two 44px icon buttons and a tabular count announced politely.

### Badge and LivePill
- **Badge:** pill, 1px border at 50–70% of the tone, text in the tone's status-text token; tones neutral, accent, ok, risk, late.
- **LivePill:** pill with an 8px dot and a word, `role="status"`. Live is a steady warm white dot in a seam outline; Reconnecting… and Offline switch dot, outline and word to risk and late. No pulse.

### Header "Track order"
- Shown only while the signed-in customer has an order in progress: a 6px warm white dot and "Track order" in 500 warm white, shortened to "Track" below 400px, 44px tall. It links to the live order.

### Sheet
- Radix dialog. Bottom sheet on phones with a 22px top corner; centred panel from 640px. Sticky header with a Gloock title and a 44px round close button. Bottom padding respects the safe area.

### DietMark and SpiceLevel
- **DietMark:** FSSAI-style white square with coloured border: veg a green dot, non-veg and egg a brown triangle. 16px in titles, 14px in rows; labelled for screen readers.
- **SpiceLevel:** one to three flame icons with an accessible label; nothing at zero.

### Menu rows
- **Featured plate:** full-width 4:3 photo, 16px corners, slow 1.03 scale on hover, Gloock title with DietMark, two-line description, price, 44px round add button outlined in seam that takes brass on hover.
- **Row:** 80px photo, 600 name with DietMark, one-line description or availability note, tabular price, seam divider. The whole row is one button.
- **Unavailable:** photo at 45% opacity and greyscale, note in place of the description.

### Test-mode note
- On the pay screen: a seam-outlined slate-surface panel, 12px corners, ash text with a warm white flask icon. Neutral steel, never a warning colour, because nothing is wrong.

### Skeleton, EmptyState, ErrorState
- **Skeleton:** slate-surface to steel gradient, shimmer only when motion is allowed.
- **EmptyState:** left-aligned Gloock title, ash body capped at 46ch, optional action.
- **ErrorState:** seam-outlined slate-surface panel, `role="alert"`, warning icon in ember, secondary "Try again".

### Paper Ticket (signature)
- **One component, two sizes.** The same ticket renders on the kitchen board (kitchen size) and as the customer's receipt (customer size).
- **Material:** ticket paper, ink type, square top and 6px bottom corners, the hanging-ticket shadow.
- **Band:** the number on its own line, the status on the line below, so neither wraps mid-phrase. On time is band steel with paper text; at risk is risk amber with ink text; late is late red with white text. Status is always written in the band. The customer receipt uses steel, or late when the promise is missed.
- **Clip:** a 48 by 16px clip-steel tab centred on the top edge, shown only when the ticket touches the rail. On the board only the first ticket in each column is clipped; the ones below hang unclipped. The customer receipt is never clipped.
- **Kitchen body:** item lines with bold tabular quantity, portion in 600, add-ons in ink muted; "N min in" timer, "Low confidence" in risk-on-paper with an icon, "Time adjusted"; a ticket-seam rule above the 64px ink action; Adjust time (seam-outlined) and Cancel order (ink muted text, late on hover) as 64px footer buttons. With-rider tickets collapse to the timer at 75% opacity.
- **Customer receipt:** item lines with prices, dashed tear line, discount and paid total in ink, GST and FSSAI licence in ink muted.

### Rail and Mini Tickets
- **Rail:** a flat 10px rail-steel bar, fully rounded, with tickets hanging directly beneath and an optional ash caption under the row.
- **Mini ticket (customer status page):** 44 by 56px paper slips with a 20px band-steel head and a clip. Up to four anonymous tickets for the queue ahead at 30% paper with dimmed band and clip, then "+N" in ash, then the customer's own: full paper, 2px brass ring, brass clip, last three digits of the order number in 12px bold tabular ink. Only the customer's own is announced to assistive tech; the caption says how many tickets are ahead.

### Order stage line
- Vertical list of five stages joined by a 1px line: completed nodes and connectors are brass with a check; the current node adds a 4px brass halo at 25%; future nodes are seam-outlined on slate. Reached stages show their time.

## Kitchen sizing floor

The kitchen board is read from two metres by people with their hands full. As shipped:
- **Order number 36px** bold tabular in the band.
- **Item lines 24px:** the line a cook acts on is never smaller.
- **Band status 20px, secondary lines 18px:** timers, flags, add-ons and footer actions; nothing on a ticket is smaller than 18px.
- **Kitchen controls 64px:** every tap target on the board is at least 64px tall: the ticket action and footer buttons, Stock, Acknowledge, the portrait column tabs, stock toggles, and the time and reason options in the adjust and cancel sheets.
- **Colour is never the only signal:** band colour always pairs with written status; low confidence pairs an icon with words; live state pairs a dot with a word.

The kitchen theme sets a 1.5rem base, so size kitchen text explicitly in rem against the root.

## Imagery

Food photography is the only saturated colour on customer screens and is shown untinted: no brand-colour overlays, duotone or filters. The only treatments are slate gradients and the left-edge slate scrim that keep type on plain ground, and greyscale on unavailable dishes. Current photographs are Unsplash stand-ins credited on the surface ("Photo: … / Unsplash"), served through the custom next/image loader at `src/lib/image-loader.ts`. Product images carry empty alt where the dish name sits beside them.

## Motion

One authored moment per surface; everything else is quiet.
- **Ticket drop** (520ms, ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)`): from 28px above, rotated -1.2deg, blurred 2px and transparent, to rest. Plays on the customer's own mini ticket after payment, and on a new kitchen ticket, which also carries a 4px brass ring at 70% for 1.2s and a chime per batch.
- **Shimmer** (1.6s linear, infinite): skeleton loading only.
- **State transitions:** 150–220ms ease-out on colour, border, opacity and the 0.98 press scale.
- **Reduced motion:** every animation and transition collapses to 1ms and one iteration; ticket drop and shimmer are also gated with `motion-safe`.

## Accessibility

- WCAG 2.2 AA in all three themes: status words use per-theme status-text tokens or risk-on-paper; brass is darkened to brass-deep on paper.
- Focus is always visible: 2px brass-lit outline, 3px offset.
- Customer and admin targets at least 44px; every kitchen target at least 64px.
- Diet marks differ by shape, not only colour, and carry an accessible name.
- LivePill and Stepper announce politely; errors use `role="alert"`.

## Do's and Don'ts

### Do:
- **Do** give each view one brass action, and keep selection states in warm white.
- **Do** set status words in `--ok-text`, `--risk-text`, `--late-text`, or risk-on-paper on a ticket; keep signal colours for bands, dots and borders.
- **Do** re-declare the `--color-*` role tokens in any new `[data-theme]` scope.
- **Do** use the shared paper ticket for anything that represents an order: band, number line, written status line.
- **Do** clip a ticket only where it touches the rail.
- **Do** name sections with a sentence-case Section Title (650, 1.125rem).
- **Do** keep numbers tabular and dish names in Gloock.
- **Do** keep healthy states still and warm white: a steady live dot, a neutral test-mode note.
- **Do** show food photography untinted, with type on plain slate rather than over the photograph.

### Don't:
- **Don't** build menus as a grid of cards; use featured plates and rows.
- **Don't** put brass on more than one control in a view, or use it for selection or decoration.
- **Don't** put a kicker or eyebrow above a heading, or set labels in small spaced capitals; spaced caps belong to the wordmark alone.
- **Don't** shadow anything but a ticket or a floating bar.
- **Don't** theme ticket paper, or recolour food photography.
- **Don't** render the rail as faux metal: it is a flat bar.
- **Don't** signal state by colour alone, or animate a healthy state.
- **Don't** add motion beyond the ticket drop without removing something; keep transitions within 150–220ms.

---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/components"]
---

# Surface brief: Company A ordering app + kitchen display

Scope: customer ordering (home, menu, checkout, pay, status), kitchen display, menu admin. Mode: Operate (customer surfaces carry appetite; kitchen is a tool).

## Direction contract

THESIS: Company A is a chef's open kitchen at night; the customer orders at the pass and watches their ticket go up on the rail. Refuses the orange delivery-app card grid.

OWN-WORLD: slate #141312, steel #24231F with 1px seams, warm white #F2EEE6, one brass #B08D57 for the single live action; paper-white tickets #F4F1EA with ink; amber/red only for kitchen urgency. Gloock display, Hanken Grotesk UI, tabular figures.

STORY: hungry diner sees honest time from the real kitchen, picks a dish, pays in under a minute, then sees their ticket on that outlet's rail.

FIRST VIEWPORT: full-bleed lit biryani photo, "Company A" set small in spaced caps top-left, dish line in Gloock large, outlet + arrival promise beneath, brass "See the menu" bottom; kitchen: steel rail across, tickets hang in four columns.

FORM: user-pinned Chef's Open Kitchen (after three re-rolls), seed 6c961c1f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: on payment success the order prints as a ticket and clips onto the outlet rail (shared component with the kitchen display), with "N tickets ahead of yours".
Motion grammar: one authored moment per surface (ticket clip; kitchen new-ticket drop + chime); everything else 150–220ms ease-out-expo.

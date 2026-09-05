# RETURN HANDOFF - CHIP PACKING MICRO-PATCH (v47.11)

Base: the v47.10 draft usability package (cumulative: this ZIP contains
v47.9 + v47.10 + this). BUILD_V stays "v47".

Files changed: `app.js` (one CSS declaration inside `ensureTraitsCss`),
`index.html` (app.js cache key -> `20260731-chip-packing-v47`). styles.css
is untouched by this delta.

## The change

Owner report: on a heavily labeled card ("19-20 Trail Blazers" + GRAVITY +
four community labels), the community chips all dropped to a second line even
when one or two would have fit beside the engine chip. Cause: the four chips
travel inside one `.tchips-inline` wrapper, which is a single atomic flex item
of `.pr-sub` - if the whole block does not fit, the whole block wraps.

Fix, one declaration:

    .tchips-inline { display: contents }

The wrapper's box dissolves, each chip becomes its own `.pr-sub` flex item,
chips pack the year/team line until it is genuinely full, and only the true
overflow wraps. The span stays in the DOM, so the duplicate-append guard,
the label cache pathway, tap delegation, the legend, dedupe, the four-label
cap, and the cue animation are all untouched. Chip spacing rides `.pr-sub`'s
8px gap (previously 5px inside the wrapper) - uniform with the engine chip's
existing spacing.

## Validation (same real-Chromium harness as v47.9, rebuilt from this build)

- Full trait interaction suite: 21/21 still green (colors, decorator
  immunity, dedupe, cap, tap-to-expand/collapse, legend, keyboard, 390/900px).
- Lillard-shaped card (engine + 4 labels), measured per-chip rows:
  390px -> GRAVITY | PLAY ISO-D CLTCH CH#1 (PLAY misses row 1 by 9px of real
  geometry); 430px (Pro Max) -> GRAVITY PLAY | ISO-D CLTCH CH#1;
  900px -> GRAVITY PLAY ISO-D CLTCH | CH#1. Fill first, spill only the rest.
- Wrapper computes `display: contents`; chips confirmed as individual flex
  items; DOM order unchanged (engine chip always first).

## Deploy

Drag the package contents into the repo root, commit, hard-reload once.
NO D1 migration, no console command. Footer still "| v47".

Smoke: finish a Classic run on a phone - a card with an engine chip plus
several labels should show labels flowing beside the engine chip until the
line fills, then continuing on the next line. Tap any chip: expands as before.

Rollback: restore `app.js` + `index.html` from the v47.10 package.

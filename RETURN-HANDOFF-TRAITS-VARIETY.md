# RETURN HANDOFF - QUESTION VARIETY + IDK + SEEN STORE (v47.16)

Cumulative on the v47.15 mid-season Heat Check package. BUILD_V stays "v47".
Files changed vs v47.15: `functions/api/traits.js` (session ranking query
only - a Pages Function, deploys with the same drag, NO D1 migration),
`app.js` (widget IDK + seen store), `bonuses/index.html` (persistent seen
store), `index.html` (cache key). `styles.css` untouched (the IDK face lives
in the widget's injected CSS).

## 1. The diagnosis (owner's hunch, confirmed)

Every new user WAS getting nearly the same five questions in nearly the same
order. The session score was `editorial_priority + MAX(0, 60 - votes) +
contested(<=40) + (ABS(RANDOM()) % 25)`: a 0-24 jitter against a +60
starvation term can only swap near-ties, so the top of the ranking was
effectively frozen for everyone until vote counts drifted.

## 2. Variety with a quality floor (the worker)

The `fillTier` query is now two-stage: the quality ranking runs pure
(priority + starvation + contested, jitter REMOVED), a pool of the **top 18**
is cut, and the session draws from that pool in random order. Every session
is a different hand dealt from the same strong deck; a question ranked 40th
on quality - the 2022 Markus Howard rim-protection tier - can mathematically
never surface while 18 better ones exist. The tier structure (never-answered
first, answered-once second, exhausted last) is unchanged, as are the pinned
`?q=` lane, the two-answer ceiling, and every other op.

Verified by running the SHIPPED SQL (extracted from the file, tier-0
predicate substituted) against a real SQLite database seeded with 40
questions of descending quality: 30 trials produced 30 distinct first-five
orderings, all 18 pool members rotated through a first-five, and q19-q40
never appeared once.

## 3. IDK on the widget (homepage + results, one shared module)

The vote row is now three equal columns: amber YES, red NO, **grey IDK** -
same 52px height, same 3D slab treatment, zero vertical growth (the row was
52px with two buttons and is 52px with three). IDK is a **pass**, not a
vote: nothing is written server-side (an unsure lean is the full page's
UNSURE vote; a pass means "stop asking me this one"). The id goes into the
seen store, a `traits_vote` event fires with action "pass" so the funnel can
see pass rates per question, and the session advances after a short pressed
beat. The full /bonuses/ page keeps its existing YES / NO / UNSURE controls
unchanged.

## 4. The persistent seen store

One localStorage key, `t82TraitsSeen`, shared by the widget and /bonuses/
(same origin). Any **vote** on either surface, and any **pass** on the
widget, adds the question id. Capped at 400 ids FIFO; every read/write is
try/catch so private mode and blocked storage degrade to exactly today's
behavior.

How it feeds back into the feeds:
- The widget's session fetch and the /bonuses/ session fetch both send the
  freshest 48 store ids as `&exclude=` (the server already honored this
  param and slices at 48; /bonuses/ previously sent only the current visit's
  `doneIds` - those now merge with the store).
- The results widget's drafted-roster lane filters locally-seen questions
  client-side before display (op=roster has no exclude param), and its
  session top-up carries the exclude like everywhere else.
- **A pinned/shared question is never excluded**: the client strips the
  `?q=`/featured id from the exclude list, so a shared deep link always
  lands even for someone who already answered it (change-vote remains the
  path there).

Honest limits, per the ask ("to the extent possible"): the store is per
browser, cleared with site data, capped at 400, and only 48 ride the wire -
so a very deep history can eventually resurface old passes. Votes have a
server-side backstop regardless (the answer tiers already demote them);
passes are local-only by design.

## 5. Validation

- Worker: SQLite smoke of the shipped query (section 2) + `node --check`.
- Widget suite (now 36 checks x2 widths where applicable): IDK renders in
  the same row at equal thirds and 52px with the grey face; a pass advances
  to the next question and writes the id to localStorage; a seeded store
  rides the session fetch as `exclude=` with the featured pin stripped;
  plus the full prior regression (share, deep links, heights, decorator).
- Page suite (25 checks): a vote writes the id to the shared store; on the
  `?q=` deep-link lane the persistent ids ride `exclude=` while the pinned
  question itself is never excluded; plus the full prior regression
  (vote path, shares, refresher, preload lane).
- All six suites re-run green against the final files, including the
  mid-season Heat Check suite.

## 6. Deploy

1. Drag the package contents into the repo root (flat), commit, let Pages
   deploy. The worker change rides the same deploy (functions/ directory).
   NO D1 MIGRATION, NO CONSOLE COMMAND.
2. Hard-reload once: app.js cache key -> `?v=20260801-traits-variety-v47`.
3. Footer still reads "| v47".

Rollback: restore `functions/api/traits.js`, `app.js`, `bonuses/index.html`,
`index.html` from the v47.15 package. The localStorage key is inert without
the code; no data to unwind.

## 7. Smoke checklist

- [ ] Open the homepage in two fresh private windows: the five questions
      differ in content and/or order between them (drawn from the same
      top pool).
- [ ] The widget row shows YES / NO / IDK as three equal buttons, IDK grey,
      box the same size as yesterday.
- [ ] Tap IDK: the question passes with no result beat and the session moves
      on; finish or reload - that question does not come back.
- [ ] Vote on a question, reload: it does not come back on the widget or on
      /bonuses/.
- [ ] Open a shared /bonuses/<slug> link for a question you already answered:
      it still lands and shows (CHANGE VOTE available).
- [ ] Clear site data: the feed resets to fresh-user behavior (expected).

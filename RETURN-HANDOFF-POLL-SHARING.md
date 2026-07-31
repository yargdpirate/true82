# RETURN HANDOFF - POLL DISTRIBUTION + NAVIGATION PACKAGE (v47.13)

Base: the v47.11 chip packing package (cumulative ZIP: v47.9 through this).
v47.13 folds in three owner revisions on the v47.12 draft of this package.
BUILD_V stays "v47". Files changed: `app.js`, `styles.css`,
`bonuses/index.html`, `index.html`. The votes worker
(`functions/api/traits.js`), simulation, scoring, polling cadence, analytics
clients, and all database code are untouched.

## 1. Identification (done before any code)

- **Canonical question URL (reused, not invented):**
  `/bonuses/<slug>?src=<tag>` for curated questions, `/bonuses/?q=<id>&src=<tag>`
  otherwise - exactly what the full page's existing `shareQuestion()` already
  builds, what `functions/bonuses/[slug].js` server-renders with a preloaded
  question, and what `op=session&q=<ref>` pins. `/traits/?q=` remains a live
  legacy alias (redirect shell). Every new share and door in this package
  emits this same family; `src=s` on shares so receiving sessions keep
  logging entry source "share".
- **Stats Refresher destination (reused):** the Basketball-Reference BPM
  leaders page, tagged the house way (`utm_source=true82.net` +
  `utm_campaign`), i.e. `bbrefTag(BBREF_BPM_LEADERS, ...)` - the same link the
  rules sheet already labeled STATS REFRESHER.
- **Vote path (untouched):** POST `/api/traits` `op=vote` with same-origin
  credentials riding the first-party identity cookie. Sharing is pure
  navigation; nothing in this package writes a vote, mints an identity, or
  goes around the worker's abuse controls.

## 2. What shipped, surface by surface

**Homepage + results voting widget (one shared module, `app.js`):** the foot
row that held only the progress pips now holds them left and one compact mono
`SHARE` tool right. The full-page door (owner revision): `VOTE ON 5 MORE` on
the completion beat is now a real anchor to `/bonuses/?src=<surface>` instead
of restarting the inline loop, so the deeper session hands off to the full
page and no separate FULL PAGE foot tool is needed. The widget's standing
title link stays a door throughout (on the results surface it now carries
`results_prompt` instead of misreporting `home_module`). `SHARE` uses the Web Share API where present, else copies
"Vote on this one: <question>" plus the deep link and beats COPIED on the
tool for 1.4s. The tool is text-height with an invisible `::after` pad
supplying the 44px touch target, so the module measures **exactly** its
v47.11 height (266px -> 266px at 390, 226px -> 226px at 900; foot row 13px in
both builds). Share hides on session completion. The tool is excluded from
`decorate3dButtons` so the global 3D-slab observer never restyles it.

**Full voting page (`bonuses/index.html`):** the question card's toprow gains
a compact `SHARE` control beside the `n / N` counter - same text-height +
`::after` technique, toprow 14px -> 14px, card 527px -> 527px. It reuses the
page's own `shareQuestion()`, extended with a nullable result so a pre-vote
share reads "Vote on this one: ..." while every post-vote variant is
byte-identical to before; the copy fallback beats COPIED on the control when
the post-vote `#flash` line doesn't exist yet. The stats refresher (owner revision) is a
prominent, normally-styled button ON the question card: a full-width
`act-share` slab under the vote controls, `STATS REFRESHER \u2197`, linking to
**that question's own player** on Basketball-Reference (the reliable
`/search/?search=<player>` route, which lands on the player's page,
campaign-tagged `bonuses`, new tab). It re-points every question, hides for
editorial questions without a player, and leaves the card with the controls
once the vote lands. No foot line.

**How To area (`app.js` rules sheet + `styles.css`):** the footer's
"Full engine math \u2192" link is gone - nothing in the sheet promises engine
math anymore. STATS REFRESHER is now an actual button: an anchor wearing the
`rs-got` slab as a dark secondary (tunnel face, amber label) beside the amber
GOT IT primary, same destination and `howto` campaign as before. On sub-340px
screens the two buttons sit side by side, so the footer got *shorter* there
(97px -> 73px); at normal widths it is height-identical.

## 3. Validation (real Chromium, real files, extracted functions - not copies)

Widget suite at 390 + 900px: FULL PAGE foot tool verified retired and
`VOTE ON 5 MORE` verified as an anchor to `/bonuses/?src=<surface>`; native
share payload is the slug deep link + `src=s`
with the exact question text; `share_open`/`share_copy` analytics named like
the full page's; clipboard fallback writes text + newline + link and beats
COPIED; slugless questions fall back to `?q=<id>&src=s`; completion hides
share; decorator immunity; **module height and foot row
measured equal to a v47.11 build rendered side by side under its own CSS**.

Full-page suite, 16 checks against the real HTML with only fetch/identity
stubbed: pre-vote share control renders at zero height delta (toprow 14->14,
card 527->527); native + copy share verified; **a YES tap still POSTs the
identical `op=vote` body and renders the result; the post-vote SHARE
QUESTION, CHANGE VOTE, and voted-text variants are regression-checked
working**; `?q=<slug>` still pins the session feed and `src=s` entries log
source "share"; the refresher is a 48px `act-share` slab linking the
question's own player, present pre-vote and gone with the controls after.

**One-click brigade lane, verified end to end:** the sharer's single tap
emits `/bonuses/<slug>?src=s`. A recipient opening it hits
`functions/bonuses/[slug].js`, which serves the shell with per-question Open
Graph tags (a rich preview wherever the link lands) and the question
preloaded. The harness simulates exactly that server output and proves the
vote controls render instantly with zero session round trip first, and that
a YES tap posts `op=vote` against that exact question id with entry source
"share". Slugless questions ride `?q=<id>&src=s` into the same pinned lane
(also verified). Sharing itself never writes a vote or touches identity.

Rules-foot suite at 390/340/320px: new footer never taller than old (equal at
390, shorter below 340), refresher renders as the dark secondary slab with no
underline and a one-line label.

Regression: the full v47.9 trait suite (21 checks) and the full v47.10 draft
usability suite (24 checks) re-passed against these final files.

## 4. Deployment

1. Drag the package contents into the GitHub repo root (flat), commit, let
   Pages deploy. NO D1 migration, NO console command.
2. Hard-reload once: `app.js` and `styles.css` cache keys both moved to
   `?v=20260731-poll-share-r2-v47`. `bonuses/index.html` is plain HTML and
   picks up on its own.
3. Footer still reads "| v47".

Rollback: restore `app.js`, `styles.css`, `bonuses/index.html`, `index.html`
from the v47.11 package. No data to unwind.

## 5. Focused smoke checklist

Homepage widget (phone + desktop):
- [ ] Widget shows pips left, SHARE right, one row, box the same size as
      yesterday.
- [ ] SHARE on iPhone opens the system share sheet with the question text
      and its link; on desktop it flips to COPIED and the pasted link opens
      that exact question.
- [ ] Vote through all five: SHARE disappears on the completion beat and
      VOTE ON 5 MORE opens the full /bonuses/ page.

Results widget:
- [ ] Same three checks after finishing any run; shared links land on the
      drafted-player question that was on screen.

Full voting page:
- [ ] SHARE sits beside the 1 / 5 counter without moving the card; works
      before voting (share sheet or COPIED) and the received link opens that
      question.
- [ ] Voting, the result beat, CHANGE VOTE, and the post-vote SHARE QUESTION
      all behave exactly as before.
- [ ] STATS REFRESHER \u2197 sits as a full-width button under UNSURE, opens
      THAT player's Basketball-Reference page in a new tab, and disappears
      once you vote.
- [ ] A shared /bonuses/<slug> link from an old recap or chat still lands
      pinned (existing routes preserved).

How To sheet (open from any draft):
- [ ] Footer shows two buttons: dark STATS REFRESHER \u2197 and amber GOT IT.
      No "Full engine math" anywhere.
- [ ] Refresher opens Basketball-Reference in a new tab; GOT IT still closes.
- [ ] On the smallest phones the two buttons share one row.

# TRUE82 — RETURN HANDOFF FROM v47 HOME-VOTE TO v47.7

**Audience:** the agent who authored the original `true82-v47-home-vote.zip` build.

**Purpose:** resume work without rereading the game, simulation, analytics, retention, or existing trait architecture. This document is based on an exact file-by-file diff between the original archive and `true82-v47.7-homepage-controversy-v2.zip`, not conversational memory.

## 1. Executive summary

The original architecture was preserved. The work since v47 is confined to the existing PLAYER BONUSES / traits subsystem.

Only these browser/server executable files differ from the supplied v47 archive:

1. `app.js`
2. `functions/api/traits.js`
3. `bonuses/index.html`
4. `index.html` — cache-bust string only

Everything else executable that exists in both supplied archives is byte-identical, including:

- `analytics.js`
- `retention-client.js`
- `styles.css`
- `functions/avocado.js`
- `functions/api/event.js`
- `functions/api/identity.js`
- `functions/api/retention.js`
- `functions/api/retention-dashboard.js`
- `functions/bonuses/[slug].js`
- `functions/[id].js`
- `functions/r/[id].js`

No simulation, scoring, player-value, salary, win projection, challenge, Daily, share-recap, or analytics event schema was changed.

The shortest useful review is:

- review the isolated trait-card block in `app.js`;
- review the three selection branches in `functions/api/traits.js`;
- review the small variable-session adaptation in `bonuses/index.html`;
- treat migrations 0018, 0019, 0020, and 0023 as additive data changes.

## 2. Exact code review map

### A. `app.js`

Review only the PLAYER BONUSES area and the roster-section markup.

#### Trait-card UI

Current line region: approximately 1769–2034.

New elements:

- `TRAIT_CARD_ABBR`
- `traitCardAbbr()`
- `wireTraitCardUi()`
- compact button styling appended inside `ensureTraitsCss()`

Behavior:

- Results-page player labels display abbreviations.
- Tap a chip to expand it to the full trait name; tap elsewhere to collapse.
- One `i` button beside `YOUR FIVE` opens a roster-specific legend.
- The legend lists only labels currently present on those five cards.
- A one-time viewport cue animates the chips and information button.
- Discovery state is stored under `t82_trait_card_ui_seen_v1`.
- `prefers-reduced-motion` disables the cue.
- Anti-labels remain red and struck through.
- Labels remain read-only and have zero scoring effect.

Abbreviation map:

- Three-Point Shooter → `3PT`
- Super Three-Point Shooter → `GRAV`
- Iso Defender → `ISO-D`
- Team Defender → `TEAM-D`
- Rim Protector → `RIM-D`
- Playmaker → `PLAY`
- Clutch → `CLTCH`
- Rim Pressurer → `RIM+`
- Off-Ball Scorer → `OFF-B`
- Switchable Defender → `SWCH-D`
- Tough Shot Maker → `TSHOT`
- Off-Court Knucklehead → `OFC-R`
- Ball Stopper → `BSTOP`
- Foul Merchant → `FOUL$`
- Stat Padder → `STAT+`
- Championship #1 → `CH#1`
- Ball Pounder → `BPOUND`

Old retired names also have fallback abbreviations.

#### Anonymous-identity readiness

Current line region: approximately 2051 onward.

`traitsIdentityReady()` waits up to 2.8 seconds for the existing retention identity recovery handshake before requesting question feeds. It does not create a new identifier. It allows the existing localStorage fallback to restore the first-party `t82_rid` cookie before `/api/traits` calculates its purpose-scoped voter hash.

#### Variable-length sessions and roster fallback

Current line regions: approximately 2066–2235.

Changes:

- The UI accepts one through five questions rather than assuming exactly five.
- Progress dots, completion copy, and analytics completion value use `TM.qs.length`.
- The client preserves API ordering instead of independently removing all questions with a prior vote.
- Results-page roster questions are kept first; empty slots are filled from the curated under-two-answer pool.

#### Label rendering

Current line region: approximately 2247–2277.

`wireTraitsLabels()` still fetches `op=labels` and still caps display at four labels per player. The only functional change is rendering buttons with abbreviated text and full-name data attributes instead of passive full-name spans.

#### Results markup

Current line region: approximately 5318–5322.

The `YOUR FIVE` section now has:

- class `traits-roster`;
- one hidden-until-labels-exist information button;
- one hidden legend container.

No draft-screen UI was changed.

### B. `functions/api/traits.js`

Review only `op=roster`, `op=featured`, `op=session`, and the vote response payload.

#### `op=roster`

Current line region: approximately 135–206.

The preexisting deterministic roster-question generator is unchanged in trait selection. It still uses the original 12-item `ROSTER_TRAITS` array and original hash behavior.

New behavior:

- Reads `trait_votes_v1.changed` for the current voter.
- Calculates `answer_count = changed + 1` when a vote row exists.
- Returns only roster questions answered fewer than two times.
- Returns `roster_exhausted` when all roster-specific options have reached two answers; the client then fills from the curated pool.

Important: the five new traits were **not** added to `ROSTER_TRAITS`. Ball Stopper, Foul Merchant, Stat Padder, Championship #1, and Ball Pounder work as curated/pre-seeded questions and labels, but are not yet part of automatic arbitrary-player roster generation.

#### `op=featured`

Current line region: approximately 209–233.

Original behavior selected from a daily global pool and eventually narrowed to the eight closest-to-50/50 mature questions.

Current behavior:

- raises pool query limit from 40 to 80;
- defines fresh as fewer than five eligible votes;
- defines live as the eight mature questions closest to 50/50;
- alternates by UTC day between a fresh item and the mature controversy pool when possible.

`op=featured` remains a global daily preference, not a per-user final decision. `op=session` rejects that pin when the voter has already answered it twice and other eligible questions remain.

#### `op=session`

Current line region: approximately 287–392.

The selection rule is now:

1. Never-answered questions.
2. Questions answered exactly once.
3. Questions answered at least twice only when no eligible under-two question remains.

Implementation uses the existing unique vote row and existing `changed` counter; no schema change was added.

Other details:

- A short final session of one through four questions is returned rather than padding with third repeats.
- Exclusion input limit increased from 24 to 48.
- Direct per-question navigation remains available.
- A homepage pin is treated as a preference and is skipped after two answers until the under-two pool is exhausted.
- The API now returns `answer_count` with questions.

#### Vote write path

The vote upsert and consensus settlement are unchanged. The response now additionally returns `vote.answer_count`.

The existing behavior still increments `changed` on every repeat submission, including a repeated identical response. That is intentionally treated as another answer encounter for the ceiling.

### C. `bonuses/index.html`

Current changed regions: approximately 181, 216, 246, 331–334, and 447.

Changes only:

- waits for the existing retention identity handshake before requesting a session;
- uses actual `Q.length` for progress and completion text;
- handles short final sessions correctly.

No question rendering, vote submission, result calculation, sharing, or route structure was redesigned.

### D. `index.html`

Only the `app.js` cache key changed:

- old: `20260727-homevote-v47`
- current: `20260731-answer-ceiling-v47`

## 3. Database/data changes

### Migration 0018 — five new core traits

File: `migrations/0018_trait_categories_v1.sql`

Adds:

- `ball-stopper`
- `foul-merchant`
- `stat-padder`
- `championship-number-one`
- `ball-pounder`

Adds 124 active curated questions, 123 editorial rulings, and 124 metadata rows.

Seed breakdown before later expansion:

- Ball Stopper: 17 questions, 17 editorial rulings
- Foul Merchant: 12 questions, 12 editorial rulings
- Stat Padder: 13 questions, 13 editorial rulings
- Championship #1: 53 questions, 53 editorial rulings
- Ball Pounder: 29 questions, 28 editorial rulings

The unruled exception is 2016 Draymond Green — Ball Pounder, deliberately left for community voting and marked homepage-eligible.

No trait affects the game engine. The Stat Padder definition contains engine-oriented product language, but no code consumes it for scoring.

### Migration 0019 — broad provisional label expansion

File: `migrations/0019_editorial_label_expansion_v1.sql`

Adds 344 nonduplicate player-season/trait combinations to complete the requested 360-label editorial set across 120 player-seasons, exactly three labels per selected player-season when combined with overlapping 0018 rows.

Final clean-database state after 0019:

- traits: 20
- core traits: 17
- retired traits: 3
- questions: 564
- active questions: 549
- editorial rulings: 488
- metadata rows: 544
- homepage-eligible: 30

Final editorial verdict totals are 414 `qualifies` and 74 `does_not_qualify` across all editorial data.

Operational note: the all-in-one 0019 script partially executed in Cloudflare’s web console because of the temporary staging-table workflow. Production was successfully completed using staged recovery scripts. The user confirmed final production totals:

- editorial: 488
- meta: 544
- homepage: 30

Do not rerun 0019 in that production database.

### Migration 0020 — first 25 superstar homepage questions

File: `migrations/0020_homepage_superstar_controversy_v1.sql`

SQL-only. Promotes 25 existing questions to homepage eligibility, updates public/share copy, and raises their priority to at least 96.

If applied after 0019, homepage count becomes 55.

### Migration 0023 — second 25 superstar homepage questions

File: `migrations/0023_homepage_superstar_controversy_v2.sql`

SQL-only. Promotes 25 additional existing questions, updates public/share copy, and raises their priority to at least 97.

If both 0020 and 0023 are applied after 0019, homepage count becomes 80.

Production application of 0020 and 0023 was not explicitly confirmed in the conversation. Determine current state with:

```sql
SELECT COUNT(*) AS homepage
FROM trait_question_meta_v1
WHERE homepage_eligible = 1 AND active = 1;
```

Interpretation:

- 30: neither homepage expansion confirmed applied
- 55: 0020 applied
- 80: 0020 and 0023 applied

Both migrations are idempotent and do not touch votes, consensus, or editorial verdicts.

## 4. What deliberately did not change

Do not spend review tokens revalidating these areas because this work did not touch them:

- simulation formulas or output;
- player values or salary/bank logic;
- position legality;
- Classic, Presti, Daily, or challenge rules;
- win tally or net rating;
- analytics event schema;
- retention identity generation;
- vote consensus thresholds;
- vote abuse/rate-limit rules;
- share recap generation;
- existing label consensus-over-editorial precedence;
- label cap of four per player card;
- trait display on the draft screen.

## 5. Known boundaries and future work

1. The five new traits are not in automatic `ROSTER_TRAITS` generation.
2. Abbreviations are keyed by exact `display_name`; an unknown future trait falls back to its full name.
3. The trait legend explains full names and community status but not each trait’s full definition.
4. Homepage featured choice is globally daily; per-user exhaustion is enforced in `op=session`.
5. Cross-visit repeat protection depends on the existing retention identity being available. Cookie loss, site-data clearing, another browser/device, or privacy-disabled persistence begins a fresh answer history.
6. The latest build archive contains local artifacts `test.db`, `test0023.db`, and `candidates.tsv`. They are not production source and should be removed or ignored before repository upload.

## 6. Minimum validation only

No full regression audit is needed. Run:

```bash
node --check app.js
node --check functions/api/traits.js
```

Then smoke-test:

1. Complete one Classic run and scroll to `YOUR FIVE`.
2. Confirm label chips abbreviate, expand on tap, and anti-label strike-through remains visible.
3. Confirm the `i` legend lists only labels present on the roster.
4. Confirm the one-time cue stops after interaction; reset with:

```js
localStorage.removeItem("t82_trait_card_ui_seen_v1")
```

5. Start a five-question homepage session and a `/bonuses/` session.
6. Confirm short sessions render correctly if fewer than five under-two questions remain.
7. Confirm a question answered twice is skipped while any other eligible question is below two answers.
8. Query homepage count to determine whether 0020 and 0023 are deployed.

## 7. Exact executable diff size

Compared with the original supplied v47 archive:

- `app.js`: 226 changed/additional diff lines, all concentrated in the traits block and `YOUR FIVE` markup.
- `functions/api/traits.js`: 160 changed/additional diff lines, concentrated in roster, featured, session, and answer-count payloads.
- `bonuses/index.html`: 26 changed/additional diff lines.
- `index.html`: one cache-key line.

Original-to-current SHA-256 pairs:

- `app.js`
  - original: `7bb574af82bfd0149990303d31c90d2331c7580e90fc236c30f2460f9a16faec`
  - current: `6ec301aa093849d344c642ed10c60d3a4adb346b2d77e0d9dfecb206c6415205`
- `functions/api/traits.js`
  - original: `910b86910e25a0189ac48dc31f15ff16af957e5da3b293d9135b83fc0fc2c849`
  - current: `35633ed8b05e0cdfc52e45db0ca051c509494eef58dd3147d8d4b6abc7abf837`
- `bonuses/index.html`
  - original: `40e8d2d033058053e18864d1630c40d5f0334f725a37bdcd11046f4d959eb3b8`
  - current: `cb3d7a5616104819c1b1ccea3ce068624ccb5977c4df83eddab70780adf0329f`
- `index.html`
  - original: `58ba4af22ac98465b5a10e68eeefa936e033d53cfed7001f5fb598d9299abfe4`
  - current: `57d2e942e305cfed52e27bcbbdf6870372199ffef6ea515d99883de68108ed1b`

## 8. Resume instruction

Treat the original v47 code as still authoritative outside the isolated changes described above. Do not refactor or reconstruct the trait subsystem. Continue from the current files, preserve the existing table and question-ID contracts, and review only the mapped blocks before making the next change.

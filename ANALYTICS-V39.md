# TRUE 82 analytics v39

## Privacy boundary

The analytics client creates a random visit id in memory and a random run id for each draft. Both disappear on reload or tab close. Analytics does not create or read cookies, localStorage, sessionStorage, advertising ids, IP hashes, browser fingerprints, or durable identifiers. The Worker does not store raw IP addresses or full User-Agent strings; it stores only Cloudflare's two-letter country code and coarse device, browser, and operating-system classes.

The Daily already uses localStorage for its official-run and streak feature. v39 reports only coarse counts derived from that existing game state: active Daily days, current streak, and days since the most recent locally recorded Daily. It never transmits stored dates, lineups, nonces, search text, clipboard contents, message contents, or an identifier. This is a return-behavior proxy, not user-level retention.

This is the technical implementation boundary, not a jurisdiction-specific legal opinion about notices or consent requirements.

## Deploy order

1. Apply `migrations/0006_analytics_v3.sql` once to the D1 database bound as `DB`.
2. Deploy the entire v39 site in one commit. `analytics.js`, `app.js`, `index.html`, `functions/api/event.js`, and `functions/avocado.js` are version-coupled.
3. Open `/avocado` and verify that **Live pulse** shows fresh `session_start`, `home_view`, and `data_ready` rows with build `v39`.
4. Make one Classic start, one Daily gate visit, and one share-sheet dismissal. Confirm the build-filtered dashboard records the expected funnel rows.

The endpoint fails soft to analytics v2/legacy if the application reaches production before the migration, so analytics cannot break gameplay. v3-only dashboard cards remain blank and display a migration warning until the schema exists.

## What v39 measures

### Acquisition and front door

- Landing classification: direct, external referral, campaign, internal explainer, Daily challenge link, or Tribune referral.
- Sanitized referrer origin only. No referrer path, query string, post title, Discord channel, or message text.
- Explicit `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` labels.
- Page class, navigation type, local hour, language, coarse connection class, viewport, country, device, browser, and operating-system class.
- First interaction time, home render, site-data ready/error, foreground-visible time, and input-active time capped after 30 seconds of inactivity, plus anonymous page-performance summaries.

### Home and mode discovery

- Which mode tiles actually entered the viewport.
- Mode/feature selection, including Daily, practice, Arena, Duel, League, Weekly, and the Kaman easter egg.
- Selection-to-start and start-to-finish behavior by mode.
- Generic stable control ids/classes for UI discovery. Button text, player-card text, and typed text are not captured.

### Draft behavior

- Game start, round reached, dealt franchise/decade, team/era/year rerolls, reroll cost/refund outcome, sort choice, player-row selection, draft pick, denied pick reason, slot, player-season drafted, lineup moves, total player/reroll spend, finish, Start over, and page-exit abandonment.
- Search behavior records only query length, returned-result count, zero-result outcome, mode, and entry path. The typed player name is never transmitted.
- Abandonment includes reason, round, elapsed run time, picks made, rerolls used, and searches used. Time-to-value reports visit milestones and completed/abandoned run duration.
- One random in-memory run id joins the events of a single draft. It cannot join activity after a reload or on another day/device.

### Results, sharing, and referrals

- Result record/net, undefeated flag, result-screen and section reach, replay action, percentile success/failure, and Daily challenge outcome.
- Kaman result/share events are retained for operational visibility, but Avocado reports them separately and excludes them from canonical Classic/Pro/Presti conversion and record-propensity rates.
- Share intent separately from confirmed handoff, cancellation, error, method, result surface, entry path, mode, device, browser, final record, net rating, and—when the percentile request has already returned—the displayed Top X% rank.
- Daily friend-link funnel: current/stale open, gate, start, finish, beat/tie/loss, reshare intent, and completed reshare.
- Tribune offer, open, read proxy, action, generation/fallback, publishing, edition fetch, in-page open beacon, and referral game start.
- Basketball Reference and other outbound clicks by destination host and stable in-app surface. Full destination URLs and search terms are not retained.

### Reliability and performance

- Ingestion heartbeat by important event.
- Build-by-build starts, finishes, shares, errors, and recency.
- Core Web Vitals where supported: TTFB, LCP, CLS, and INP, plus DOM-content-loaded/load timing.
- Scrubbed client/resource errors, data-load failures, share/percentile failures, and Tribune fallbacks. Error text is capped and strips URLs and long token-like strings.

## Avocado dashboard map

The v39 dashboard includes:

- Live ingestion pulse and build coverage/regression cards.
- Entry path, UTM campaign, referrer-origin, and page-quality tables.
- Actual home-tile visibility and mode-selection funnel.
- Daily gate-matched official funnel, practice split, board-by-board ledger, base-mode reconciliation, friend-link loop, and coarse local-history return proxy.
- Overall visit/run funnel, outcomes, distribution, visit depth, run-abandonment detail, time-to-value milestones, draft actions, search quality, top picks, denial reasons, rerolls, Presti economy, and bailout board.
- Results-section reach; share intent-to-handoff diagnostics by surface, path, method, environment, record, and available rank; newspaper behavior; generation reliability; Tribune edition behavior; and referral starts.
- Outbound link behavior, feedback clicks, environment, performance, and errors/fallbacks.

Use the build filter for coherent post-v39 interpretation. All-time history contains older event definitions and should be used only for broad context. New v39 dimensions are forward-only; the deploy does not manufacture or reinterpret historical rows. Avocado caps its own D1 query fan-out so the expanded dashboard does not launch every card query simultaneously.

## Campaign tagging

Use a unique campaign label for every meaningful distribution attempt, for example:

`https://true82.net/?utm_source=creator_name&utm_medium=creator_post&utm_campaign=beat_my_five_july&utm_content=post_a`

Do not reuse one campaign name across unrelated communities or creative variants. Avocado can then compare visits, starts, and finishes without a persistent user id.

## Intentional limitations

- No exact D1, D7, or D30 person-level retention cohorts.
- No cross-device identity, account history, or reliable deduplication across reloads.
- “Visits” are page lifecycles, not people. A reload creates a new visit.
- The Daily return proxy depends on the game’s 14-day local feature store and resets when the player clears site data, changes browser/device, or uses private browsing.
- Country/device/browser values are coarse operational dimensions, not identity signals.
- `sendBeacon` and page-exit events are best effort; use trends rather than expecting perfect event-by-event accounting.
- Search, abandonment, milestone, section-reach, share-rank, and other new v39 cards begin at this deployment and have no retroactive history.

## v40 appendix — the game sees its own engine
Migration 0007 (additive, apply after 0006) puts the Scoring Card on every
game_complete row: t_usage, t_spacing, b_spacing, t_backd, t_wingd, t_rim,
t_glass, t_creator, t_age. Client rounds to 2dp; the Worker clamps 0..50;
zeros are real zeros; pre-0007 rows are NULL and excluded from incidence
math. Privacy posture unchanged: these are engine outputs about a fictional
lineup, no new identity surface. Insert tier is v40-first with the same
fail-soft chain (marker: analytics-v40-migration-required). New Avocado
cards: "Scoring Card · tax incidence" (fire rate + magnitude per tax per
mode; 0007 warning when unapplied), "Heat Check · clutch and charity"
(shown / pulled / refused / silent-skip, wheel segments, hit-82 rate),
"Pool coverage · the half that never gets picked" (distinct drafted
player-seasons and names against build-time pool constants 21525/3509 —
re-pin on dataset refresh). Machine endpoint: /avocado?api=curves returns
practice-excluded win histograms (date/build scoped) for the balance bench.

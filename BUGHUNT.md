# TRUE 82 — BUGHUNT.md: where the bugs live (Fable's last note, 2026-07-06)

Not generic OWASP — these are THIS codebase's failure modes, learned the hard
way across one long day. Each angle: what breaks, why it bites *here*, how to
check. Three entries marked ⚠️LIVE were discovered while writing this file.

## 0. Three live findings (fix or accept deliberately)
- ⚠️LIVE **Manifest edits mid-league-season shift week challenges.** League
  week w's challenge = `challengeIndex(id, w, poolLen) % poolLen` computed
  LIVE. Adding/removing/reordering manifest entries changes poolLen → the
  same league-week resolves to a DIFFERENT challenge for late submitters than
  early ones (wrong-mode rejects, or worse: verified under different hooks).
  Fix options: (a) treat the manifest as append-only-at-week-boundaries law,
  or (b) store challenge_id per (league, week) at first submission/settle
  (small migration; the clean fix). Until then: never edit challenges.js
  while any league week is open.
- ⚠️LIVE **Free ops re-arm duel quips.** Quip throttle keys on `M.log.length`,
  and free mv/sw ops append to the log — so shuffling your lineup grants
  another quip. Harm: trash-talk spam only. Fix: throttle on count of
  NON-free ops, or cap quips per player per match (~10).
- ⚠️LIVE **Rematch griefing the open-match cap.** Rematch inserts with
  p1 = the *opponent*; the ≤20-open cap counts p1 rows — so rematching 20
  finished games fills the OTHER player's creation cap. Harm: mild denial of
  match-creation. Fix: count p1 OR p2 in the cap, or cap rematches per pair.

## 1. Determinism & replay (the crown jewels — break these, break everything)
- **Draw-order drift.** ANY new rng call, or a call moved across a branch,
  changes every seed's board. Goldens (§11) going red is the alarm — the
  response is investigation then a DELIBERATE `T82.VERSION` bump + a plan for
  orphaned stored runs/matches (they stop replaying: `state-corrupt`). Never
  "fix" a golden to green.
- **The Deal Law.** `dealRound` pre-increments round; deals mount with
  `round = picks`, actions with `picks+1`. Any new mount-style context (team
  modes? tournaments?) will reproduce the off-by-one that refused a 4-pick
  player's fifth board. Grep the comment before building.
- **Nondeterminism creep in hooks.** challenges/duel/league hooks must stay
  pure functions of (S, row, tables): no Date, no Math.random, no fetch, no
  locale-dependent compares (Alphabet GM uses plain `toLowerCase` string `>`;
  "upgrading" to localeCompare forks replays by runtime). §12c catches
  crashes, not impurity — impurity needs eyeball review.
- **dataVersion is coarser than the data.** version = seedOf(cols+count+span)
  — swapping two players' stats preserves the version but changes every
  board. LAW: any player-data content edit is a version event; bump
  deliberately or verified history corrupts silently.
- **Float compares.** net uses 1e-6 tolerance in verifyRun; any new derived
  stat in a claim needs the same, or replays "mismatch" on representation.

## 2. Contracts & seams (the audit's lesson: drift is silent)
- **Every new client↔server field pair gets a §14b tripwire line.** The flat
  dialect (`official:"daily"` + top-level label) already drifted once and
  would have shipped a leaderboard where nothing counted. EXTENDING.md makes
  the tripwire mandatory; actually do it.
- **Read the return json before consuming it.** The `b.rows` vs `b.top`
  class. Never render from an imagined shape.
- **typeof-guards that weaken instead of reject.** `rngDraws: undefined`
  silently SKIPPED the draws check. Audit every optional field in a
  verification path: does absence reject, or quietly verify less?
- **Post-compaction rule:** when a summary says "trust the shape," that is
  the seam to read first. Execute contracts headlessly where possible
  (daily/weekly endpoints run as pure request→response — copy that pattern).

## 3. Races & idempotency
- **Every mutating UPDATE gets an optimistic lock** (updated_ts or status
  CAS) with a `why:"raced"` → client-refetch story. Duel move is the
  template.
- **Settlement-style jobs = insert-once PK + monotonic CAS**, and must
  survive a crash between the inserts and the CAS (IGNORE semantics make the
  retry safe — prove this for any new settler).
- **Every visible state change bumps updated_ts** or ETag pollers 304 past
  it (the forfeit-materialize bug class).
- **Read-triggered writes racing submissions:** a run landing between a
  settler's score-fetch and its CAS is counted-if-fetched. Each new settle
  type must STATE its boundary in a comment; ambiguity here becomes a
  disputed championship.
- No multi-statement transactions are used — every write sequence must be
  individually reorderable/crash-safe.

## 4. Auth boundaries
- **New endpoint checklist:** who may GET, who may POST, what does anonymous
  get. IDOR = forgetting the membership/ownership WHERE clause.
- **The CSRF gate lives in readToken and nowhere else.** Any new token
  source (query param, postMessage) or any endpoint reading cookies directly
  bypasses it. Don't.
- **Fail-soft's dark side: silent auth death.** A wrong CLERK_JWT_KEY, azp
  drift after a domain change, or an expired dashboard toggle looks exactly
  like "users stopped signing in" — no errors anywhere. Canary: the signed
  vs anonymous run share (analytics query #8). After ANY env/domain change,
  run one signed smoke.
- **sid is a bearer credential for anonymous history** (claim-by-sid).
  Unguessable today; never log it, never shorten it, never echo it.

## 5. Abuse & resources
- Caps on every new array/string/loop (actions≤200, op≤64, runIds≤200 are
  the precedents). **Any stored op that doesn't consume a scarce in-game
  resource can be spammed into an unbounded replay** — new free ops need a
  storage cap even if gameplay-free.
- Growth has no pruning story yet: matches and anonymous(sid) runs
  accumulate forever. A future retention job is a settlement-class change —
  bring §3's discipline.
- lb per-user-best boards GROUP BY over runs; when they slow, the fix is an
  index, not a rewrite (check query plans before touching logic).
- Rate limits live in the Cloudflare dashboard = config, which drifts.
  Re-verify the two WAF rules after any zone/plan change.

## 6. League sharp edges (beyond §0)
- **Seats are positional forever.** Any kick/leave/replace feature must keep
  seat numbers stable (forfeit-fill the seat); renumbering breaks every past
  pairing and result row.
- Playoffs: extend BOTH `advanceDecision`'s season guard and result
  semantics; the schedule fn is ready, the guards are not.
- Only verified runs count at settle — a member whose run fails verify reads
  as a no-show. Surface league-run verify failures LOUDLY client-side.
- fast_advance intentionally drifts windows off Mondays; any UI or copy that
  assumes "resets Monday" is already wrong for fast leagues.
- All time math is UTC. The first "local time" feature request is a trap;
  answer it with display-only conversion, never stored math.

## 7. Client
- **No-build is law:** cross-file globals (DATA_READY, PENDING_FN, esc, el)
  mean any minifier/bundler that renames = silent death. If bundling ever
  happens, it's a project, not a chore.
- innerHTML assembly is the house style → every new interpolation goes
  through esc(), INCLUDING server-derived strings you "know" are safe.
- Keep countdown/window math server-computed (endsInS pattern); client Date
  math against labels reintroduces skew bugs.

## 8. Data & analytics
- Never add user ids to the events table — SECURITY.md's blast-radius
  posture depends on it.
- The SQL pack isn't tested; re-run it after every migration (schema drift
  breaks queries silently — especially `json_each(runs.picks)`, which
  assumes finish()'s picks shape `[[name, season, slot, cost],…]`).

## 9. How Fable hunted (process rules that caught tonight's bugs)
1. **Hand-compute before patching.** One red test was a wrong FIXTURE (an
   accidental h2h cycle), not a wrong engine. Recompute the expectation by
   hand first; a false "fix" in standings crowns a wrong champion forever.
2. **Assert your patches landed.** Two turns died to escaping artifacts
   (`\'`, re.subn `\u`) where the script failed BEFORE the write and
   everything after silently ran against old code. Assert counts, use
   literal-safe replaces, re-grep after writing.
3. **Get the stack.** "ASYNC SECTION CRASH" with tail -1 swallowed the
   message; one grep -A6 found `rp.S undefined` instantly. Never debug from
   an exit code.
4. Signatures are read at their definition, not inferred from one call site.
5. A feature isn't done until: tests green, validator green, RUNBOOK row,
   CONTEXT entry, tripwire extended. Cold pickup is the design constraint —
   the next model starts from these files, not from memory.

Run the checks. Read the seams. Bump versions on purpose. — F.

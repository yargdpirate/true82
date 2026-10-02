// POST /api/recap — fail-soft season-recap copywriter for the Tribune overlay.
//
// The only path: phase "edition" -> nickname + four-sentence story in one fast
// request when the reader presses READ STORY. The three-second opening sequence
// masks normal latency; slower valid editions remain in a visible typesetting
// state instead of being discarded.
//
// Any problem (not the app, no key, timeout, bad parse) returns {ok:false} with
// status 200. The browser then typesets deterministic local copy, so the paper
// never blocks and a rejected caller never learns more than "no".
//
// THE KEY IS THE APP'S, AND ONLY THE APP'S (v66.5, the owner 2026-10-01: "make
// sure it's only ever used to write tribune articles as dictated by the app").
// ANTHROPIC_API_KEY is a billable secret behind a public URL, so four guards run
// before any provider call, cheapest first. Nothing reaches the model that this
// file did not either write itself or check against the app's own vocabulary:
//   1. SAME ORIGIN. A POST must carry an Origin (browsers send it on every
//      non-GET) or, failing that, a Referer from true82.net, a *.true82.pages.dev
//      preview, or localhost. Everything else is refused unread.
//   2. ONE PHASE. Only "edition" is served. The retired "headline" and "article"
//      phases were a second and a third prompt shape, and "article" always turned
//      thinking on for 2600 tokens, so a caller could pick the costliest path.
//   3. TOTAL INPUT ALLOWLIST. Player names must be name-shaped, slots must be
//      G/F/C, and every fit note must match one of the sentences app.js can
//      actually emit (APP_NOTES / NOTE_SHAPES below). A note or name that is
//      prose of a caller's own choosing is dropped or refused, which is what
//      closes prompt injection: free text never reaches the system prompt.
//   4. BUDGET. A per-IP hourly cap, plus a daily cap for the whole site, held in
//      the KV counter namespace. This is the ceiling that still holds when a
//      script forges an Origin header, which any script can do. Both are
//      env-tunable and fail open: a KV error never costs a reader the paper.
// Guards 1 to 3 pin the shape of the request; guard 4 bounds what abuse can cost
// if someone matches the shape. A static site has no secret to give the browser,
// so these bound the blast radius; they cannot authenticate a caller outright.
//
// Bindings (Pages > Settings > Environment variables / Bindings):
//   ANTHROPIC_API_KEY   (secret, REQUIRED for AI copy — degrades locally without it)
//   RECAP_MODEL         (optional, default "claude-sonnet-4-6")
//   RECAP_VOICE         (optional house voice applied to edition copy)
//   RECAP_EDITION_THINK (optional edition thinking budget, >=1024; default off)
//   RECAP_SIGN_KEY      (secret; signs AI editions for permanent /r/:slug share pages)
//   RECAP_IP_HOURLY     (optional, default 8; editions per IP per hour, 0 = no cap)
//   RECAP_DAILY_MAX     (optional, default 2000; editions per day site-wide, 0 = no cap)
//   RECAP_OFF           (optional; "1" stops all AI copy at once, no deploy needed)
//   GAMES               (KV namespace, the games counter; also holds the two counters above)
//   DASH_KEY            (optional, as on /avocado: ?key= returns the full health detail)

const TIERS = [
  [82, "PERFECT SEASON — 82-0", "immortality achieved; euphoric and mythic — this team just did the only thing left to do"],
  [81, "81-1 — one win from immortality", "agonizing near-miss; a monument with a crack in it, greatness shadowed by the one that got away"],
  [74, "shattered the 73-9 record", "broke the greatest regular-season mark in NBA history; reverent awe"],
  [73, "matched the 73-9 record", "equaled the best regular season ever played; historic company"],
  [70, "a 70-win season", "all-time-great tier; a handful of teams in history have lived here"],
  [65, "great but not legendary", "elite and genuinely feared, but the history books stay closed"],
  [58, "a true contender", "top-seed energy; respected everywhere, doubted nowhere"],
  [50, "good but unmemorable", "a solid playoff team nobody fears; faint praise, faintly given"],
  [42, "above .500 and forgettable", "play-in purgatory; damning with faint praise"],
  [33, "the treadmill of mediocrity", "mild disappointment given the talent in the room"],
  [20, "a bad season", "lottery-bound; write the post-mortem"],
  [8,  "one of the worst seasons in memory", "bleak; gallows humor permitted"],
  [1,  "historically awful", "worse than the 9-73 Sixers; scathing but literate"],
  [0,  "0-82 — perfect futility", "immortal shame; a deadpan elegy for a season with no wins"]
];
function tierFor(w) { for (const t of TIERS) if (w >= t[0]) return t; return TIERS[TIERS.length - 1]; }

const NICKNAME_RULES = `Free-associate a vivid nickname of 2-3 words from the most recognizable public personas and off-court lives of these exact five players. An optional leading "The" does not count toward the three-word maximum. Before naming the team, silently give every player one loud, concrete association a fan might immediately know: interview energy, humor, fashion, music, acting, media presence, business empire, hobbies, family-man image, nightlife, gambling, feuds, memes, strange rituals, politics, philosophy, collecting, food, or any other genuinely distinctive public trait. Do not flatten famous personalities into generic intelligence, quietness, reading, overthinking, leadership, greatness, or "legend" language.

Build the nickname from the strongest collision among two or three of those associations. Prefer, in order:
1. A specific social dynamic or contrast that instantly evokes the actual names.
2. A playful tabloid-column or pop-culture angle grounded in recognizable public personas.
3. A dry literal label made funny by this exact combination of people.
4. LAST RESORT: an on-court vibe.

Nightlife, gossip, chaos, and vice are allowed when they are genuinely the salient connection, but they are only some of many possible categories, not the automatic answer. The result should feel a little dangerous, highly specific, and obviously playful. Reject bland book-club, silent-genius, generic praise, mythic grandeur, alliteration, and ball-sharing labels. Skip the first obvious pairing for the one only THIS roster earns. It prints as "<NICKNAME> FINISH 72-10!", so it must read naturally there.`;

const ARTICLE_RULES = `The article must be 4 short sentences, about 70 words total and never more than 90. Gossipy and fun, by a columnist more interested in personality than box-score summary. Laconic: no comp analysis, no future outlook, no questions.
Sentence 1, the nickname's origin: ONE clause, 15 words max, explaining the personality or public-persona connection as plain fact. Shape it like "Nicknamed ... because ...".
Sentence 2, one quick on-court line: name two or three players by surname and what they actually did. One sentence only; basketball is garnish, not the meal.
Sentence 3, the verdict on perfection, chosen by the final record, one short line:
- 82 wins: salute it, no flaw, no asterisk.
- 76 to 81 wins: a narrow miss pinned on ONE small thing or one flat night.
- under 76 wins: the flaw or two that capped them all year, matched to the tone directive.
Sentence 4, the kicker: invent one absurd, personality-consistent locker-room, team-flight, interview-room, group-chat, wardrobe, hobby, or off-day scene. Vary the setting; nightlife is not the default. End on this.
Never blame spacing, shooting, or shot-sharing. Never mention ratings, models, engines, fantasy, video games, or drafting. Do not use em dashes.`;

const SYS_EDITION = `You are the front-page sports editor after the 82nd and final game of an NBA season. The five players below are real, each frozen at one historical season; treat the record as established fact and write as though this season really happened.

Create the nickname and the complete short article together so the article explains the exact nickname you chose.

NICKNAME RULES:
${NICKNAME_RULES}

ARTICLE RULES:
${ARTICLE_RULES}

Return ONLY a JSON object, no markdown fences, no commentary:
{"nickname": "...", "article": "..."}`;

const DEFAULT_VOICE = `VOICE — clean, modern Sports Illustrated sports-desk prose: vivid and confident, plain-spoken, never gimmicky or old-timey. Let the roster and the record carry it.`;
const HARD = `FORMAT AND LENGTH OVERRIDE THE VOICE. Output ONLY the JSON object — no text before or after it, nothing outside the fields. Obey every length limit stated above exactly. If the voice will not fit inside the format and the length, trim the voice, never the format or the count.`;
const HARD_EDITION = `FORMAT OVERRIDES EVERYTHING. Output exactly one JSON object with both non-empty string fields "nickname" and "article". The nickname is at most three words, plus an optional leading "The". Do not omit either field or put text outside the object.`;

const BAN = `CONTENT BAN (nickname and story): never frame this team as dysfunctional for its talent, and never write it as winning "despite itself." Forbidden angles: "too many stars," "not enough shots, touches, or ball to go around," ego or usage conflict, trouble sharing the ball, a "crowded" or "shrinking" offense, "a team that shouldn't (have) work(ed)," and naming spacing, a cramped or clogged floor, or shaky shooting as a flaw. In the story, when the floor is tight, show the skill that beats it (a live handle, a shot-maker's tough two, a cutter finding the seam) and never the reason it was tight. These players won; write HOW they won, never why they supposedly couldn't. Other genuine weaknesses (defense, size, rim protection, depth) are fair game.`;

const RECAP_BUILD = "2026-10-01.tribune-app-only-v1";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const EDITION_TIMEOUT_MS = 28000;
const MAX_BODY_BYTES = 8000;          // the app's edition payload is about 2 KB
const DEFAULT_IP_HOURLY = 8;          // a reader finishes one season at a time
const DEFAULT_DAILY_MAX = 2000;       // site-wide ceiling; raise it if real play ever nears it

/* ---- the app's own payload (KEEP IN SYNC with app.js buildRecapPayload /
        recapFitNotes; test.js runs real drafts through both and fails if the
        app can emit anything this block would not accept) ------------------- */
const ALLOWED_SLOTS = new Set(["G", "F", "C"]);          // app.js BUCKETS
// A real player name: letters (the dataset has diacritics and one Cyrillic
// letter), spaces, periods, apostrophes, hyphens. The longest in site_data.json
// is "Nickeil Alexander-Walker" at 24 characters and 4 words; the room left over
// is for a hh surname line like "S. O'Neal", never for a sentence.
const NAME_RE = /^\p{L}[\p{L}\p{M}'’.\- ]{0,39}$/u;
const HOT_TIER_RE = /^[\p{L}\p{N}'’.\- ]{1,12}$/u;   // a Hot Hand segment label, clamped to 12 as before
const nameOK = (s) => NAME_RE.test(s) && s.trim().split(/\s+/).length <= 5;

// Every fixed note recapFitNotes() can push.
const APP_NOTES = new Set([
  "surplus shooting: extra floor-spacers stretch every defense",
  "two small guards: they get posted up and shot over all night",
  "an undersized frontcourt: the other team owns the offensive glass",
  "a balanced five: no structural weakness the model could tax",
  "nobody on the roster can guard the other team's best scorer",
  "nobody wants the last shot in a close game",
  "nobody rotates on defense",
  "nobody attacks the rim or gets to the line",
  "nobody can make a tough shot when a play breaks down",
  "three off-court knuckleheads share a locker room",
  "two off-court knuckleheads share a locker room",
  "two players who hold the ball: it goes in and it does not come out",
  "two defenders the other team hunts on every switch",
  "two foul merchants living at the line until the playoff whistle disappears",
  "stat padding: numbers that do not add up to winning",
  "three switchable defenders: they switch everything",
  "a playmaker keeps finding two off-ball scorers cutting to the rim"
]);
// ...and the five it builds around engine numbers.
const NUM = "-?\\d{1,4}(?:\\.\\d{1,2})?";
const NOTE_SHAPES = [
  new RegExp("^more than one ball's worth of stars: their usage adds up to " + NUM +
    " against the " + NUM + " a lineup can share(, with two alphas still figuring out how to play together, not just alongside each other)?$"),
  new RegExp("^only " + NUM + " of " + NUM + " required floor-spacers: the floor shrinks in the half court$"),
  new RegExp("^" + NUM + " shooters on a board that charges for every one past " + NUM + ": the extra spacing cost points$"),
  new RegExp("^both starting guards rank bottom-" + NUM + "% defensively: the perimeter leaks$"),
  new RegExp("^both forwards rank bottom-" + NUM + "% defensively: the frontcourt gets attacked$")
];
const appNoteOK = (s) => APP_NOTES.has(s) || NOTE_SHAPES.some((re) => re.test(s));

// Who may spend the key. Browsers send Origin on every non-GET request; Referer
// is the fallback for the rare client that does not, and for the console's
// zero-token health probe.
const LIVE_HOSTS = new Set(["true82.net", "www.true82.net", "localhost", "127.0.0.1", "[::1]"]);
function hostAllowed(h) {
  const host = String(h || "").toLowerCase();
  if (!host) return false;
  if (LIVE_HOSTS.has(host)) return true;
  return host === "true82.pages.dev" || host.endsWith(".true82.pages.dev") || host.endsWith(".localhost");
}
function callerHost(request) {
  for (const header of ["origin", "referer"]) {
    const raw = request.headers.get(header);
    if (!raw || raw === "null") continue;
    try { return new URL(raw).hostname.toLowerCase(); } catch (e) { return null; }
  }
  return null;
}
/* ---- end app-payload block --------------------------------------------------- */

/* ---- share-page signature (KEEP BYTE-EQUIVALENT with functions/r/[id].js) ---- */
const SIGN_VERSION = "t82share.v2";
const sigClean = (s, max) => String(s == null ? "" : s).replace(/[<>{}\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const sigNum = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
const modeKeyForSig = (m) => (m === "cap" ? "cap" : m === "pro" ? "pro" : "classic");
function canonicalShare(mode, wins, net, nickname, article, players) {
  return {
    mode: modeKeyForSig(mode),
    wins: Math.round(sigNum(wins, 0, 82)),
    net: sigNum(net, -100, 100).toFixed(1),
    nickname: sigClean(nickname, 48),
    article: sigClean(article, 700),
    players: (Array.isArray(players) ? players : []).slice(0, 5).map((p) => ({
      slot: sigClean(p && p.slot, 2) || "?",
      yr: Math.round(sigNum(p && p.yr, 1974, 2030)),
      name: sigClean(p && p.name, 40) || "Unknown",
      v: sigNum(p && p.v, -5, 25).toFixed(1)
    }))
  };
}
function shareSigMessage(mode, wins, net, nickname, article, players) {
  return SIGN_VERSION + "\n" + JSON.stringify(canonicalShare(mode, wins, net, nickname, article, players));
}
async function hmacHex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
/* ---- end synced block -------------------------------------------------------- */

const envInt = (v, dflt) => {
  if (v == null || v === "") return dflt;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
};

// The spend ceiling. KV is eventually consistent and this read-then-write can
// undercount under load, which is fine for a brake: it bounds abuse, it is not
// an accounting ledger. Every failure path returns null (allow), because the
// paper matters more than the cap.
async function budgetSpend(env, request, log) {
  const ipMax = envInt(env.RECAP_IP_HOURLY, DEFAULT_IP_HOURLY);
  const dayMax = envInt(env.RECAP_DAILY_MAX, DEFAULT_DAILY_MAX);
  if (!env.GAMES || (!ipMax && !dayMax)) return null;

  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const hourKey = ipMax && ip ? "rl:recap:ip:" + ip + ":" + Math.floor(Date.now() / 3600000) : null;
  const dayKey = dayMax ? "rl:recap:day:" + new Date().toISOString().slice(0, 10) : null;
  try {
    const [hourRaw, dayRaw] = await Promise.all([
      hourKey ? env.GAMES.get(hourKey) : Promise.resolve(null),
      dayKey ? env.GAMES.get(dayKey) : Promise.resolve(null)
    ]);
    const hourN = parseInt(hourRaw || "0", 10) || 0;
    const dayN = parseInt(dayRaw || "0", 10) || 0;
    if (hourKey && hourN >= ipMax) return { reason: "rate_ip", ipCount: hourN, ipMax };
    if (dayKey && dayN >= dayMax) return { reason: "rate_day", dayCount: dayN, dayMax };
    await Promise.all([
      hourKey ? env.GAMES.put(hourKey, String(hourN + 1), { expirationTtl: 3600 }) : Promise.resolve(),
      dayKey ? env.GAMES.put(dayKey, String(dayN + 1), { expirationTtl: 172800 }) : Promise.resolve()
    ]);
    return null;
  } catch (e) {
    log("budget_error", e && e.message ? String(e.message).slice(0, 120) : "kv");
    return null;   // never let the counter keep a reader from the paper
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const started = Date.now();
  const model = env.RECAP_MODEL || DEFAULT_MODEL;
  const configured = !!env.ANTHROPIC_API_KEY;
  const recapOff = /^(1|true|yes|on)$/i.test(String(env.RECAP_OFF == null ? "" : env.RECAP_OFF));
  const suppliedId = request.headers.get("x-t82-recap-id");
  const requestId = suppliedId && /^[A-Za-z0-9._-]{6,80}$/.test(suppliedId)
    ? suppliedId
    : (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : "r" + Date.now().toString(36));
  let phase = "unknown";

  const cleanHeader = (v) => String(v == null ? "" : v).replace(/[\r\n]/g, " ").slice(0, 180);
  const elapsed = () => Date.now() - started;
  const log = (result, reason, extra = {}) => {
    console.log("[tribune]", JSON.stringify(Object.assign({
      build: RECAP_BUILD,
      requestId,
      phase,
      model,
      result,
      reason: reason || null,
      elapsedMs: elapsed()
    }, extra)));
  };
  const respond = (body, status = 200, result = "ok", reason = null) => {
    const ms = elapsed();
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-t82-recap-build": RECAP_BUILD,
      "x-t82-recap-id": requestId,
      "x-t82-recap-model": cleanHeader(model),
      "x-t82-recap-phase": cleanHeader(phase),
      "x-t82-recap-result": cleanHeader(result),
      "server-timing": `recap;dur=${ms}`
    });
    if (reason) headers.set("x-t82-recap-reason", cleanHeader(reason));
    return new Response(request.method === "HEAD" ? null : JSON.stringify(Object.assign({
      requestId,
      model,
      phase,
      elapsedMs: ms,
      build: RECAP_BUILD
    }, body)), { status, headers });
  };
  const fail = (reason, extra = {}) => {
    log("fallback", reason, extra);
    return respond(Object.assign({ ok: false, reason }, extra), 200, "fallback", reason);
  };

  const host = callerHost(request);
  const fromApp = hostAllowed(host);

  // Zero-token deployment/binding probe for browser-console diagnostics. The
  // detail (whether a billable key is bound, which model, which budgets) is the
  // owner's, so a stranger gets the bare "deployed" answer.
  if (request.method === "GET" || request.method === "HEAD") {
    phase = "health";
    const url = new URL(request.url);
    const keyed = !!env.DASH_KEY && url.searchParams.get("key") === env.DASH_KEY;
    if (!fromApp && !keyed) {
      log("health", "not_app", { host: cleanHeader(host) });
      return respond({ ok: true, health: true }, 200, "health", null);
    }
    const editionThink = envInt(env.RECAP_EDITION_THINK, 0);
    log("health", null, {
      configured, signKey: !!env.RECAP_SIGN_KEY, editionThink, editionTimeoutMs: EDITION_TIMEOUT_MS,
      ipHourly: envInt(env.RECAP_IP_HOURLY, DEFAULT_IP_HOURLY), dailyMax: envInt(env.RECAP_DAILY_MAX, DEFAULT_DAILY_MAX),
      budgetBinding: !!env.GAMES, off: recapOff
    });
    return respond({
      ok: true,
      health: true,
      configured,
      signKey: !!env.RECAP_SIGN_KEY,
      editionThink,
      editionTimeoutMs: EDITION_TIMEOUT_MS,
      ipHourly: envInt(env.RECAP_IP_HOURLY, DEFAULT_IP_HOURLY),
      dailyMax: envInt(env.RECAP_DAILY_MAX, DEFAULT_DAILY_MAX),
      budgetBinding: !!env.GAMES,
      off: recapOff,
      message: recapOff
        ? "RECAP_OFF is set: every edition is the local one. Unset it to print AI copy again."
        : configured
        ? (env.RECAP_SIGN_KEY ? "Recap generation and signed share pages are configured." : "Recap generation is configured; RECAP_SIGN_KEY is missing, so shares use the bare site URL.")
        : "Recap Function is deployed but ANTHROPIC_API_KEY is not bound in this environment."
    }, 200, "health", null);
  }
  if (request.method !== "POST") {
    phase = "method";
    log("method_not_allowed", "method");
    return respond({ ok: false, reason: "method" }, 405, "error", "method");
  }

  // GUARD 1 — the app's own pages only, before the body is even read.
  if (!fromApp) {
    log("blocked", "not_app", { host: cleanHeader(host) });
    return respond({ ok: false, reason: "not_app" }, 403, "blocked", "not_app");
  }
  // The owner's off switch: one environment variable stops every AI edition
  // without a deploy, and the paper prints its local copy as it always does.
  if (recapOff) return fail("off");
  if (!configured) return fail("unconfigured", { configured: false });

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return fail("too_large", { declared });

  let b;
  try { b = await request.json(); } catch (e) { return fail("bad_json", { errorName: e && e.name }); }
  if (!b || typeof b !== "object" || !Array.isArray(b.players) || b.players.length !== 5) return fail("bad_payload");

  // GUARD 2 — one phase. "headline" and "article" are retired: an old cached
  // client that still asks for them falls back to local copy, which is what it
  // does for every other {ok:false} and the reason the paper never blocks.
  phase = b.phase === "edition" ? "edition" : "retired";
  if (phase !== "edition") return fail("phase_retired", { asked: cleanHeader(b.phase) });

  const clean = (s, max) => String(s == null ? "" : s).replace(/[<>{}\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  // Product contract: at most three nickname words, with an optional leading
  // "The" outside that count. The prompt should normally satisfy this; the
  // clamp keeps the newspaper layout deterministic when a model occasionally
  // runs long.
  const normalizeNickname = (value) => {
    const raw = clean(value, 80).replace(/^\s*["'“‘]+|["'”’]+\s*$/g, "");
    const words = raw.split(/\s+/).filter(Boolean);
    const maxWords = words.length && /^the$/i.test(words[0].replace(/[^A-Za-z]/g, "")) ? 4 : 3;
    return clean(words.slice(0, maxWords).join(" ").replace(/[,:;.!?]+$/, ""), 48);
  };
  const reconcileNickname = (article, original, normalized) => {
    if (!original || !normalized || original === normalized) return article;
    const escaped = String(original).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return article.replace(new RegExp(escaped, "gi"), normalized);
  };
  const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };

  const wins = Math.round(num(b.wins, 0, 82));
  const losses = 82 - wins;
  const modeLabel = b.mode === "cap" ? "Presti (salary-cap draft)" : b.mode === "pro" ? "Pro draft" : "Classic draft";

  // GUARD 3 — a roster the app could have drafted, or nothing at all. The slot,
  // the season and the value were already clamped; the name is the one field
  // that carried free text into the system prompt, so it has to be a name.
  const players = [];
  for (const p of b.players) {
    const slot = clean(p && p.slot, 2);
    const name = clean(p && p.name, 40);
    if (!ALLOWED_SLOTS.has(slot) || !name || !nameOK(name)) {
      return fail("bad_player", { slotOK: ALLOWED_SLOTS.has(slot), nameChars: name.length });
    }
    players.push({ slot, yr: Math.round(num(p && p.yr, 1974, 2030)), name, v: num(p && p.v, -5, 25).toFixed(1) });
  }
  // Fit notes: only sentences app.js can actually emit survive. A note is
  // checked whole and then clamped to 110 for the prompt exactly as before, so
  // the model sees the same bytes it always did.
  const offered = (Array.isArray(b.notes) ? b.notes : []).slice(0, 6).map((n) => clean(n, 400)).filter(Boolean);
  const notes = offered.filter(appNoteOK).map((n) => n.slice(0, 110));
  const notesDropped = offered.length - notes.length;
  const hhPlayer = clean(b.hh && b.hh.player, 30);
  const hhTier = clean(b.hh && b.hh.tier, 12);
  const hh = hhPlayer && nameOK(hhPlayer) && hhTier && HOT_TIER_RE.test(hhTier) ? { player: hhPlayer, tier: hhTier } : null;

  const t = tierFor(wins);
  const user = `MODE: ${modeLabel}
FINAL RECORD: ${wins}-${losses} (82 games)
SEASON TIER: ${t[1]}
TONE DIRECTIVE: ${t[2]}
LATE-SEASON ERUPTION: ${hh ? hh.player + " caught fire down the stretch (" + hh.tier + ")" : "none"}
ROSTER (slot / season / player / lineup value):
${players.map(p => `${p.slot} / ${p.yr} / ${p.name} / ${p.v}`).join("\n")}
COMPOSITION SIGNALS (how the five fit together):
${notes.length ? notes.map(n => "- " + n).join("\n") : "- a reasonably balanced five"}`;

  const voice = env.RECAP_VOICE || DEFAULT_VOICE;
  const editionThink = envInt(env.RECAP_EDITION_THINK, 0);
  const useThink = editionThink >= 1024;
  const thinkBudget = editionThink;
  const maxTokens = useThink ? thinkBudget + 900 : 900;
  const timeoutMs = EDITION_TIMEOUT_MS;
  const system = SYS_EDITION + "\n\n" + voice + "\n\n" + BAN + "\n\n" + HARD + "\n\n" + HARD_EDITION;

  // GUARD 4 — the spend ceiling, charged only once a request is this app's and
  // this shape, so junk never eats a reader's allowance.
  const over = await budgetSpend(env, request, log);
  if (over) {
    log("blocked", over.reason, over);
    return respond(Object.assign({ ok: false, reason: over.reason }, over), 200, "blocked", over.reason);
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  log("provider_request", null, { configured: true, wins, useThink, thinkBudget, maxTokens, timeoutMs, notesDropped });
  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ac.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(Object.assign({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }]
      }, useThink ? { thinking: { type: "enabled", budget_tokens: thinkBudget } } : {}))
    });
  } catch (e) {
    clearTimeout(timer);
    return fail(e && e.name === "AbortError" ? "timeout" : "provider_fetch", {
      errorName: e && e.name,
      errorMessage: cleanHeader(e && e.message),
      timeoutMs
    });
  }
  clearTimeout(timer);

  const providerRequestId = resp.headers.get("request-id") || resp.headers.get("x-request-id") || null;
  let rawBody = "";
  try { rawBody = await resp.text(); } catch (e) {
    return fail("provider_body", { providerStatus: resp.status, providerRequestId, errorName: e && e.name });
  }

  let data = null;
  try { data = JSON.parse(rawBody); } catch (e) {
    return fail("provider_non_json", {
      providerStatus: resp.status,
      providerRequestId,
      providerPreview: cleanHeader(rawBody.slice(0, 220))
    });
  }

  if (!resp.ok) {
    const providerError = data && data.error || {};
    return fail("api_" + resp.status, {
      providerStatus: resp.status,
      providerRequestId: data.request_id || providerRequestId,
      providerErrorType: cleanHeader(providerError.type),
      providerMessage: cleanHeader(providerError.message)
    });
  }

  const providerId = data.request_id || providerRequestId;
  const stopReason = data.stop_reason || null;
  const usage = data.usage ? {
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
    cacheReadTokens: data.usage.cache_read_input_tokens,
    cacheCreateTokens: data.usage.cache_creation_input_tokens
  } : null;

  try {
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
    const cleaned = text.replace(/```json|```/g, "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first < 0 || last <= first) return fail("parse_no_object", { providerRequestId: providerId, stopReason, usage, textChars: text.length });
    const out = JSON.parse(cleaned.slice(first, last + 1));
    let article = clean(out.article, 700);
    if (!article) return fail("empty", { providerRequestId: providerId, stopReason, usage, textChars: text.length });
    const originalNick = clean(out.nickname, 80);
    const nick = normalizeNickname(originalNick);
    if (!nick) return fail("empty", { providerRequestId: providerId, stopReason, usage, textChars: text.length });
    article = clean(reconcileNickname(article, originalNick, nick), 700);
    const diagnostic = { providerRequestId: providerId, stopReason, usage, timeoutMs };
    let sig = null;
    if (env.RECAP_SIGN_KEY) {
      try { sig = await hmacHex(env.RECAP_SIGN_KEY, shareSigMessage(b.mode, wins, b.net, nick, article, players)); }
      catch (e) { log("sign_error", cleanHeader(e && e.message)); }
    }
    log("api", null, { providerRequestId: providerId, stopReason, usage, nicknameChars: nick.length, nicknameTrimmed: originalNick !== nick, articleChars: article.length, signed: !!sig });
    return respond(Object.assign({ ok: true, nickname: nick, article, source: "api", diagnostic }, sig ? { sig } : {}), 200, "api", null);
  } catch (e) {
    return fail("parse", {
      providerRequestId: providerId,
      stopReason,
      usage,
      errorName: e && e.name,
      errorMessage: cleanHeader(e && e.message)
    });
  }
}

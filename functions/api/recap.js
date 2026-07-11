// POST /api/recap — fail-soft season-recap copywriter for the Tribune overlay.
//
// Preferred browser path:
//   phase "edition"  -> nickname + four-sentence story in one fast request when
//                       the reader presses READ STORY. No thinking by default,
//                       because one round trip is cheaper than two serial calls. The three-second
//                       opening sequence masks normal latency; slower valid editions
//                       remain in a visible typesetting state instead of being discarded.
//
// Legacy-compatible paths remain available for old clients:
//   phase "headline" -> nickname only
//   phase "article"  -> story written to a supplied nickname
//
// Any problem (no key, timeout, bad parse) returns {ok:false} with status 200.
// The browser then typesets deterministic local copy, so the paper never blocks.
//
// Bindings (Pages > Settings > Environment variables / Bindings):
//   ANTHROPIC_API_KEY   (secret, REQUIRED for AI copy — degrades locally without it)
//   RECAP_MODEL         (optional, default "claude-sonnet-4-6")
//   RECAP_VOICE         (optional house voice applied to article/edition copy)
//   RECAP_HEADLINE_THINK (optional legacy headline thinking budget, >=1024)
//   RECAP_EDITION_THINK  (optional edition thinking budget, >=1024; default off)

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

const NICKNAME_RULES = `Free-associate a 2-4 word nickname from the most salient public-persona associations of these exact five players. Silently tag each player with one or two recognizable traits first: temperament, interview style, fashion, hobbies, business or creative interests, signature habits, public memes, intensity, eccentricity, or self-presentation. Then find the sharpest shared trait, contrast, or unlikely social dynamic that only this roster produces.
Rank angles best to worst:
1. A specific personality intersection or contrast shared by at least two names.
2. A dry literal label that becomes funny because of who is on the roster.
3. A culturally salient reference tied to multiple players' public personas.
4. LAST RESORT: an on-court vibe.
Do not default to clubs, partying, gambling, scandals, or generic greatness. Use nightlife only when it is unusually defining for several players. Reject generic praise, mythic grandeur, alliteration, and ball-sharing jokes. Skip the first obvious pairing for the one only THIS roster earns. It prints as "<NICKNAME> FINISH 72-10", so it must read naturally there.`;

const ARTICLE_RULES = `The article must be 4 short sentences, about 70 words total and never more than 90. Gossipy and fun, by a columnist more interested in personality than box-score summary. Laconic: no comp analysis, no future outlook, no questions.
Sentence 1, the nickname's origin: ONE clause, 15 words max, explaining the personality or public-persona connection as plain fact. Shape it like "Nicknamed ... because ...".
Sentence 2, one quick on-court line: name two or three players by surname and what they actually did. One sentence only; basketball is garnish, not the meal.
Sentence 3, the verdict on perfection, chosen by the final record, one short line:
- 82 wins: salute it, no flaw, no asterisk.
- 76 to 81 wins: a narrow miss pinned on ONE small thing or one flat night.
- under 76 wins: the flaw or two that capped them all year, matched to the tone directive.
Sentence 4, the kicker: invent one absurd, personality-consistent locker-room, team-flight, interview-room, group-chat, wardrobe, hobby, or off-day scene. Vary the setting; nightlife is not the default. End on this.
Never blame spacing, shooting, or shot-sharing. Never mention ratings, models, engines, fantasy, video games, or drafting. Do not use em dashes.`;

const SYS_HEADLINE = `You name the team on the newspaper front page after the 82nd and final game of an NBA season. The five players below are real, each frozen at one historical season; the record is established fact.

${NICKNAME_RULES}

Output only the nickname on a single line (a leading "The" is fine): no quotes, no explanation.`;

const SYS_ARTICLE = `You are a Sports Illustrated columnist filing a short season-ending blurb after this team's 82nd and final game. The roster is real NBA players, each frozen at one specific season of his career; treat the record as established fact and write as though it were a real NBA season. The nickname is already in print, and your job is to explain it.

Return ONLY a JSON object, no markdown fences, no commentary:
{"article": "..."}

${ARTICLE_RULES}`;

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
const HARD_HEAD = `FORMAT OVERRIDES THE VOICE. Output ONLY the nickname itself, on a single line: no quotes, no markdown, no explanation, nothing before or after it.`;
const HARD_EDITION = `FORMAT OVERRIDES EVERYTHING. Output exactly one JSON object with both non-empty string fields "nickname" and "article". Do not omit either field and do not put text outside the object.`;

const BAN = `CONTENT BAN (nickname and story): never frame this team as dysfunctional for its talent, and never write it as winning "despite itself." Forbidden angles: "too many stars," "not enough shots, touches, or ball to go around," ego or usage conflict, trouble sharing the ball, a "crowded" or "shrinking" offense, "a team that shouldn't (have) work(ed)," and naming spacing, a cramped or clogged floor, or shaky shooting as a flaw. In the story, when the floor is tight, show the skill that beats it (a live handle, a shot-maker's tough two, a cutter finding the seam) and never the reason it was tight. These players won; write HOW they won, never why they supposedly couldn't. Other genuine weaknesses (defense, size, rim protection, depth) are fair game.`;

const RECAP_BUILD = "2026-07-10.roster-polish-v1";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const EDITION_TIMEOUT_MS = 28000;

export async function onRequest(context) {
  const { request, env } = context;
  const started = Date.now();
  const model = env.RECAP_MODEL || DEFAULT_MODEL;
  const configured = !!env.ANTHROPIC_API_KEY;
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

  // Zero-token deployment/binding probe for browser-console diagnostics.
  if (request.method === "GET" || request.method === "HEAD") {
    phase = "health";
    const editionThink = Math.max(0, parseInt(env.RECAP_EDITION_THINK, 10) || 0);
    log("health", null, { configured, editionThink, editionTimeoutMs: EDITION_TIMEOUT_MS });
    return respond({
      ok: true,
      health: true,
      configured,
      editionThink,
      editionTimeoutMs: EDITION_TIMEOUT_MS,
      message: configured ? "Recap Function and API-key binding are available." : "Recap Function is deployed but ANTHROPIC_API_KEY is not bound in this environment."
    }, 200, "health", null);
  }
  if (request.method !== "POST") {
    phase = "method";
    log("method_not_allowed", "method");
    return respond({ ok: false, reason: "method" }, 405, "error", "method");
  }

  if (!configured) return fail("unconfigured", { configured: false });

  let b;
  try { b = await request.json(); } catch (e) { return fail("bad_json", { errorName: e && e.name }); }
  if (!b || typeof b !== "object" || !Array.isArray(b.players) || b.players.length !== 5) return fail("bad_payload");
  phase = b.phase === "article" ? "article" : b.phase === "edition" ? "edition" : "headline";

  const clean = (s, max) => String(s == null ? "" : s).replace(/[<>{}\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };

  const wins = Math.round(num(b.wins, 0, 82));
  const losses = 82 - wins;
  const modeLabel = b.mode === "cap" ? "Presti (salary-cap draft)" : b.mode === "pro" ? "Pro draft" : "Classic draft";
  const players = b.players.map(p => ({
    slot: clean(p.slot, 2) || "?",
    yr: Math.round(num(p.yr, 1974, 2030)),
    name: clean(p.name, 40) || "Unknown",
    v: num(p.v, -5, 25).toFixed(1)
  }));
  const notes = (Array.isArray(b.notes) ? b.notes : []).slice(0, 6).map(n => clean(n, 110)).filter(Boolean);
  const hh = b.hh && b.hh.player ? { player: clean(b.hh.player, 30), tier: clean(b.hh.tier, 12) } : null;
  const nickname = clean(b.nickname, 48);
  if (phase === "article" && !nickname) return fail("bad_payload");

  const t = tierFor(wins);
  const fullContext = `MODE: ${modeLabel}
FINAL RECORD: ${wins}-${losses} (82 games)
SEASON TIER: ${t[1]}
TONE DIRECTIVE: ${t[2]}
LATE-SEASON ERUPTION: ${hh ? hh.player + " caught fire down the stretch (" + hh.tier + ")" : "none"}
ROSTER (slot / season / player / lineup value):
${players.map(p => `${p.slot} / ${p.yr} / ${p.name} / ${p.v}`).join("\n")}
COMPOSITION SIGNALS (how the five fit together):
${notes.length ? notes.map(n => "- " + n).join("\n") : "- a reasonably balanced five"}`;

  const user = phase === "headline"
    ? `FINAL RECORD: ${wins}-${losses}
ROSTER (season / player):
${players.map(p => `${p.yr} ${p.name}`).join("\n")}`
    : phase === "article"
      ? `${fullContext}
TEAM NICKNAME ALREADY IN PRINT: ${nickname}`
      : fullContext;

  const isArticle = phase === "article";
  const isEdition = phase === "edition";
  const voice = env.RECAP_VOICE || DEFAULT_VOICE;
  const headThink = Math.max(0, parseInt(env.RECAP_HEADLINE_THINK, 10) || 0);
  const editionThink = Math.max(0, parseInt(env.RECAP_EDITION_THINK, 10) || 0);
  const useThink = isArticle || (isEdition ? editionThink >= 1024 : headThink >= 1024);
  const thinkBudget = isArticle ? 1400 : isEdition ? editionThink : headThink;
  const maxTokens = isArticle ? 2600 : isEdition ? (useThink ? thinkBudget + 900 : 900) : (useThink ? thinkBudget + 512 : 512);
  const timeoutMs = isArticle ? 30000 : isEdition ? EDITION_TIMEOUT_MS : 24000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let system;
  if (isArticle) system = SYS_ARTICLE + "\n\n" + voice + "\n\n" + BAN + "\n\n" + HARD;
  else if (isEdition) system = SYS_EDITION + "\n\n" + voice + "\n\n" + BAN + "\n\n" + HARD + "\n\n" + HARD_EDITION;
  else system = SYS_HEADLINE + (env.RECAP_VOICE ? "\n\n" + env.RECAP_VOICE : "") + "\n\n" + HARD_HEAD;

  log("provider_request", null, { configured: true, wins, useThink, thinkBudget, maxTokens, timeoutMs });
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
    if (isArticle || isEdition) {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first < 0 || last <= first) return fail("parse_no_object", { providerRequestId: providerId, stopReason, usage, textChars: text.length });
      const out = JSON.parse(cleaned.slice(first, last + 1));
      const article = clean(out.article, 700);
      if (!article) return fail("empty", { providerRequestId: providerId, stopReason, usage, textChars: text.length });
      if (isEdition) {
        const nick = clean(out.nickname, 48);
        if (!nick) return fail("empty", { providerRequestId: providerId, stopReason, usage, textChars: text.length });
        const diagnostic = { providerRequestId: providerId, stopReason, usage, timeoutMs };
        log("api", null, { providerRequestId: providerId, stopReason, usage, nicknameChars: nick.length, articleChars: article.length });
        return respond({ ok: true, nickname: nick, article, source: "api", diagnostic }, 200, "api", null);
      }
      const diagnostic = { providerRequestId: providerId, stopReason, usage, timeoutMs };
      log("api", null, { providerRequestId: providerId, stopReason, usage, articleChars: article.length });
      return respond({ ok: true, article, source: "api", diagnostic }, 200, "api", null);
    }

    let nickRaw = text.replace(/```json|```/g, "").trim();
    const js = nickRaw.indexOf("{"), je = nickRaw.lastIndexOf("}");
    if (js !== -1 && je > js) {
      try { const o = JSON.parse(nickRaw.slice(js, je + 1)); if (o && o.nickname) nickRaw = String(o.nickname); } catch (e2) {}
    }
    nickRaw = nickRaw.split("\n")[0].replace(/^\s*["'\u201C\u2018]+|["'\u201D\u2019]+\s*$/g, "");
    const nick = clean(nickRaw, 48);
    if (!nick) return fail("empty", { providerRequestId: providerId, stopReason, usage, textChars: text.length });
    const diagnostic = { providerRequestId: providerId, stopReason, usage, timeoutMs };
    log("api", null, { providerRequestId: providerId, stopReason, usage, nicknameChars: nick.length });
    return respond({ ok: true, nickname: nick, source: "api", diagnostic }, 200, "api", null);
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

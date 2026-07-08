// POST /api/recap — two-phase season-recap copywriter for the Tribune overlay.
//   phase "headline": nickname + dek only. Fires at EVERY season end -> kept cheap
//                     (small thinking budget, tiny output).
//   phase "article":  the four-sentence story. Fires ONLY when the reader presses
//                     READ MORE (rare), written to match the nickname already shown.
// Fail-soft like the rest of the API: ANY problem (no key, over budget, timeout,
// bad parse) returns {ok:false} with status 200 and the client writes that piece
// locally instead. Never a 500, never blocks the game.
//
// Bindings (Pages > Settings > Environment variables / Bindings):
//   ANTHROPIC_API_KEY   (secret, REQUIRED for AI copy — feature degrades without it)
//   GAMES               (KV, optional — reused for soft daily budget counters)
//   RECAP_MODEL         (optional, default "claude-sonnet-4-6")
//   RECAP_HEADLINE_CAP  (optional, default 400 AI headlines/day)
//   RECAP_ARTICLE_CAP   (optional, default 150 AI articles/day)

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

const NICKNAME_RULES = `nickname — 2 to 4 words, Title Case, the name the league would give this exact team based on the players' collective real-world personalities and likely collective style of play. It must read as a PLURAL subject, because the headline is composed as "<NICKNAME> FINISH <record>" (e.g. "The Fragile Five Finish 61-21"). May begin with "The". Be EXTREMELY creative and memorable. Do not simply base the headline off of the fact that they are a group of superstars, and do not reference that they have trouble sharing the ball. Never use a real NBA franchise name, a player's name, or profanity.`;

const SYS_HEADLINE = `You are the creative Copy Editor naming the front-page title after the 82nd and final game of an NBA regular season. The roster is composed of several players from different historical seasons. Treat the season and record as established fact.

Return ONLY a JSON object — no markdown fences, no commentary:
{"nickname": "...", "dek": "..."}

${NICKNAME_RULES}

dek — one subhead line, at most 90 characters, sentence case. Sharp, not cute. Calibrated to the season tier and tone directive provided.`;

const SYS_ARTICLE = `You are the lead basketball columnist at Sports Illustrated filing the front-page story after the 82nd and final game of an NBA regular season. The roster is made up of real players, each independently set at one specific real season of his career. Treat the season and record as established fact. The headline and team nickname are already set in type — your story must fit them. Prose, not analysis.

Return ONLY a JSON object — no markdown fences, no commentary:
{"article": "..."}

article — EXACTLY four natural-length sentences, 75 to 100 words total, written like the punchy opening paragraph of a Sports Illustrated column. Narrative, not analysis: no stat citations, no lists. Center it on the on-court strengths and weaknesses of THIS composition — how these particular players do and don't fit — naming two to four of them by surname. Mention personality only where a player is genuinely famous for it. Calibrate every word to the season tier and tone directive provided. If a late-season eruption is noted, you may weave it in. Never mention ratings, models, engines, video games, or drafting. Do not invent injuries, trades, or quotes. Do not use em dashes more than once.`;

// Applied to BOTH phases (nickname + dek + body) so the whole Tribune shares one voice.
// Override live from the Cloudflare dashboard with RECAP_VOICE — no redeploy needed.
const DEFAULT_VOICE = `VOICE — render every word (nickname, dek, and story) in the voice of a 1920s newspaper sports barker: breathless and theatrical, thick with jazz-age slang and carnival flim-flam, fond of alliteration and big ballyhoo. Gloriously over-the-top and old-timey, never modern. Keep every length, format, and content rule above fully intact.`;

// Appended AFTER the voice so it wins on recency: the flim-flam must obey format + length.
const HARD = `FORMAT AND LENGTH OVERRIDE THE VOICE. Output ONLY the JSON object — no text before or after it, nothing outside the fields. Obey every length limit stated above exactly. If the flim-flam will not fit inside the format and the length, trim the flim-flam, never the format or the count.`;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("method", { status: 405 });
  const fail = (reason) => new Response(JSON.stringify({ ok: false, reason }), {
    status: 200, headers: { "content-type": "application/json" }
  });

  if (!env.ANTHROPIC_API_KEY) return fail("unconfigured");

  let b;
  try { b = await request.json(); } catch { return fail("bad_json"); }
  if (!b || typeof b !== "object" || !Array.isArray(b.players) || b.players.length !== 5) return fail("bad_payload");
  const phase = b.phase === "article" ? "article" : "headline";

  // Sanitize hard: this text goes into a prompt. Strip angle brackets and braces,
  // clamp lengths, coerce numbers. One garbage POST must not steer the model.
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
  const nickname = clean(b.nickname, 48);   // article phase: the name already in print
  if (phase === "article" && !nickname) return fail("bad_payload");

  // Soft daily budgets so a traffic spike can't run up the API bill. KV get/put is
  // not atomic — caps are order-of-magnitude, not exact meters. Fail OPEN when KV
  // is missing/down: the cap is best-effort, the feature is not.
  if (env.GAMES) {
    try {
      const cap = phase === "article"
        ? Math.max(1, parseInt(env.RECAP_ARTICLE_CAP, 10) || 150)
        : Math.max(1, parseInt(env.RECAP_HEADLINE_CAP, 10) || 400);
      const capKey = "recapcap:" + phase.charAt(0) + ":" + new Date().toISOString().slice(0, 10);
      const used = parseInt(await env.GAMES.get(capKey), 10) || 0;
      if (used >= cap) return fail("budget");
      await env.GAMES.put(capKey, String(used + 1), { expirationTtl: 172800 });
    } catch (e) { /* KV down -> fail open */ }
  }

  const t = tierFor(wins);
  const user =
`MODE: ${modeLabel}
FINAL RECORD: ${wins}-${losses} (82 games)
SEASON TIER: ${t[1]}
TONE DIRECTIVE: ${t[2]}
LATE-SEASON ERUPTION: ${hh ? hh.player + " caught fire down the stretch (" + hh.tier + ")" : "none"}${phase === "article" ? `
TEAM NICKNAME ALREADY IN PRINT: ${nickname}` : ""}
ROSTER (slot / season / player / lineup value):
${players.map(p => `${p.slot} / ${p.yr} / ${p.name} / ${p.v}`).join("\n")}
COMPOSITION SIGNALS (how the five fit together):
${notes.length ? notes.map(n => "- " + n).join("\n") : "- a reasonably balanced five"}`;

  const isArticle = phase === "article";
  const voice = env.RECAP_VOICE || DEFAULT_VOICE;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), isArticle ? 20000 : 18000);
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
      body: JSON.stringify({
        model: env.RECAP_MODEL || "claude-sonnet-4-6",
        max_tokens: isArticle ? 2600 : 1400,
        thinking: { type: "enabled", budget_tokens: isArticle ? 1400 : 700 },
        system: (isArticle ? SYS_ARTICLE : SYS_HEADLINE) + "\n\n" + voice + "\n\n" + HARD,
        messages: [{ role: "user", content: user }]
      })
    });
  } catch (e) { clearTimeout(timer); return fail("timeout"); }
  clearTimeout(timer);
  if (!resp.ok) return fail("api_" + resp.status);

  try {
    const data = await resp.json();
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
    const raw = text.replace(/```json|```/g, "").trim();
    const out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    if (isArticle) {
      const article = clean(out.article, 700);
      if (!article) return fail("empty");
      return new Response(JSON.stringify({ ok: true, article, source: "api" }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    }
    const nick = clean(out.nickname, 48), dek = clean(out.dek, 120);
    if (!nick) return fail("empty");
    return new Response(JSON.stringify({ ok: true, nickname: nick, dek, source: "api" }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  } catch (e) { return fail("parse"); }
}

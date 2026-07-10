// POST /api/recap — fail-soft season-recap copywriter for the Tribune overlay.
//
// Preferred browser path:
//   phase "edition"  -> nickname + four-sentence story in one fast request when
//                       the reader presses READ STORY. No thinking by default,
//                       because the three-second opening sequence is the latency
//                       budget and one round trip is cheaper than two serial calls.
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

const NICKNAME_RULES = `Free-associate a 2-4 word nickname that lands as a cutting, gossipy inside joke about WHO these specific players are off the court — the thing a clever rival fan tweets for a laugh. Tabloid angles: reputations, feuds, egos, nightlife, scandals, memes.
Rank your angles, best to worst:
1. A shared off-court reputation or story they are actually known for (known gamblers -> "The Match Fixers"; famous partiers -> "The Partiers"; DUI history -> "The Designated Drivers").
2. A deadpan label, funny because it is dryly literal or self-aware ("The Smartest Guys in the Room"; "The Idiots").
3. LAST RESORT: a two-word free association on the roster's vibe. On-court playstyle is the fallback, never the default.
HARD NO — reject on sight:
- Generic praise ("The Untouchables", "The Real Deal"): if it reads as a compliment, it is dead.
- Ball-sharing, usage, touches, or "too many stars" ("The Unsharables", "The Ball Hogs"). Never.
- Alliteration. Epic or mythic grandeur (no Legends, Titans, Gods, Kings, Dynasty, Empire, Immortals).
Skip the first obvious pairing for the one only THIS roster earns. It prints as "<NICKNAME> FINISH 72-10", so it must read right there.`;

const ARTICLE_RULES = `The article must be 4 short sentences, about 70 words total and never more than 90. Gossipy and fun, by a columnist who cares more about the locker room than the box score. Laconic: no comp analysis, no future outlook, no questions.
Sentence 1, the nickname's origin: ONE clause, 15 words max, stating the off-court or personality reason they earned it as plain fact and committing fully, no hedging or winking. Shape it like "Nicknamed ... because ...".
Sentence 2, one quick on-court line: name two or three players by surname and what they actually did. One sentence only; the basketball is garnish, not the meal.
Sentence 3, the verdict on perfection, chosen by the final record, one short line:
- 82 wins (a perfect 82-0, any way): salute it, no flaw, no asterisk.
- 76 to 81 wins: a narrow miss pinned on ONE small thing (a fair-game soft spot, or one flat night).
- under 76 wins: the flaw or two that capped them all year, plain, matched to the tone directive.
Sentence 4, the kicker: invent one juicy, absurd off-court drama beat about this group (a feud, a nightlife legend, an ego war, a ridiculous incident), played completely straight with full tabloid energy. Keep it comic and good-natured, never a real crime or a genuine accusation. End on this.
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
  const phase = b.phase === "article" ? "article" : b.phase === "edition" ? "edition" : "headline";

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
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), isArticle ? 20000 : isEdition ? 9500 : 18000);

  let system;
  if (isArticle) system = SYS_ARTICLE + "\n\n" + voice + "\n\n" + BAN + "\n\n" + HARD;
  else if (isEdition) system = SYS_EDITION + "\n\n" + voice + "\n\n" + BAN + "\n\n" + HARD + "\n\n" + HARD_EDITION;
  else system = SYS_HEADLINE + (env.RECAP_VOICE ? "\n\n" + env.RECAP_VOICE : "") + "\n\n" + HARD_HEAD;

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
        model: env.RECAP_MODEL || "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }]
      }, useThink ? { thinking: { type: "enabled", budget_tokens: thinkBudget } } : {}))
    });
  } catch (e) { clearTimeout(timer); return fail("timeout"); }
  clearTimeout(timer);
  if (!resp.ok) return fail("api_" + resp.status);

  try {
    const data = await resp.json();
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
    if (isArticle || isEdition) {
      const raw = text.replace(/```json|```/g, "").trim();
      const out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      const article = clean(out.article, 700);
      if (!article) return fail("empty");
      if (isEdition) {
        const nick = clean(out.nickname, 48);
        if (!nick) return fail("empty");
        return new Response(JSON.stringify({ ok: true, nickname: nick, article, source: "api" }), {
          status: 200, headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: true, article, source: "api" }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    }

    let nickRaw = text.replace(/```json|```/g, "").trim();
    const js = nickRaw.indexOf("{"), je = nickRaw.lastIndexOf("}");
    if (js !== -1 && je > js) {
      try { const o = JSON.parse(nickRaw.slice(js, je + 1)); if (o && o.nickname) nickRaw = String(o.nickname); } catch (e2) {}
    }
    nickRaw = nickRaw.split("\n")[0].replace(/^\s*["'\u201C\u2018]+|["'\u201D\u2019]+\s*$/g, "");
    const nick = clean(nickRaw, 48);
    if (!nick) return fail("empty");
    return new Response(JSON.stringify({ ok: true, nickname: nick, source: "api" }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  } catch (e) { return fail("parse"); }
}

// POST /api/recap — two-phase season-recap copywriter for the Tribune overlay.
//   phase "headline": nickname only. Fires at EVERY season end -> kept CHEAP:
//                     no thinking by default, no BAN block, minimal user payload
//                     (record + roster names; ~55% fewer input tokens than v1).
//   phase "article":  the four-sentence story. Fires ONLY when the reader presses
//                     READ MORE (rare), written to match the nickname already shown.
// Fail-soft like the rest of the API: ANY problem (no key, timeout, bad parse) returns
// {ok:false} with status 200 and the client writes that piece locally instead. Never a
// 500, never blocks the game.
//
// Bindings (Pages > Settings > Environment variables / Bindings):
//   ANTHROPIC_API_KEY   (secret, REQUIRED for AI copy — feature degrades without it)
//   RECAP_MODEL         (optional, default "claude-sonnet-4-6")

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
Skip the first obvious pairing for the one only THIS roster earns. It prints as "<NICKNAME> FINISH 72-10", so it must read right there. Output only the nickname on a single line (a leading "The" is fine): no quotes, no explanation.`;

const SYS_HEADLINE = `You name the team on the newspaper front page after the 82nd and final game of an NBA season. The five players below are real, each frozen at one historical season; the record is established fact.

${NICKNAME_RULES}`;

const SYS_ARTICLE = `You are a Sports Illustrated columnist filing a short season-ending blurb after this team's 82nd and final game. The roster is real NBA players, each frozen at one specific season of his career; treat the record as established fact and write as though it were a real NBA season. The nickname is already in print, and your job is to explain it.

Return ONLY a JSON object, no markdown fences, no commentary:
{"article": "..."}

article — 4 short sentences, about 70 words total and never more than 90. Gossipy and fun, a columnist who cares more about the locker room than the box score. Laconic: no comp analysis, no future outlook, no questions.
Sentence 1, the nickname's origin: ONE clause, 15 words max, stating the off-court or personality reason they earned it as plain fact and committing fully, no hedging or winking. Shape it like "Nicknamed ... because ...".
Sentence 2, one quick on-court line: name two or three players by surname and what they actually did. One sentence only; the basketball is garnish, not the meal.
Sentence 3, the verdict on perfection, chosen by the final record, one short line:
- 82 wins (a perfect 82-0, any way): salute it, no flaw, no asterisk.
- 76 to 81 wins: a narrow miss pinned on ONE small thing (a fair-game soft spot, or one flat night).
- under 76 wins: the flaw or two that capped them all year, plain, matched to the tone directive.
Sentence 4, the kicker: invent one juicy, absurd off-court drama beat about this group (a feud, a nightlife legend, an ego war, a ridiculous incident), played completely straight with full tabloid energy. Keep it comic and good-natured, never a real crime or a genuine accusation. End on this.
Never blame spacing, shooting, or shot-sharing. Never mention ratings, models, engines, fantasy, video games, or drafting. Do not use em dashes.`;

// Applied to the ARTICLE by default. The HEADLINE skips the default voice (noise for a
// 2-4 word name) but picks up a custom RECAP_VOICE from the dashboard when set — so the
// flim-flam barker below still flavors both phases if you paste it into RECAP_VOICE:
// To bring back the 1920s flim-flam barker, paste THIS into the RECAP_VOICE dashboard value:
//   render every word (nickname, dek, and story) in the voice of a 1920s newspaper sports barker: breathless and theatrical, thick with jazz-age slang and carnival flim-flam, fond of alliteration and big ballyhoo, gloriously over-the-top and old-timey.
const DEFAULT_VOICE = `VOICE — clean, modern Sports Illustrated sports-desk prose: vivid and confident, plain-spoken, never gimmicky or old-timey. Let the roster and the record carry it.`;

// Appended AFTER the voice so it wins on recency: the flim-flam must obey format + length.
const HARD = `FORMAT AND LENGTH OVERRIDE THE VOICE. Output ONLY the JSON object — no text before or after it, nothing outside the fields. Obey every length limit stated above exactly. If the flim-flam will not fit inside the format and the length, trim the flim-flam, never the format or the count.`;

// Headline is a bare string (per NICKNAME_RULES), not JSON — this tail wins on recency.
const HARD_HEAD = `FORMAT OVERRIDES THE VOICE. Output ONLY the nickname itself, on a single line: no quotes, no markdown, no explanation, nothing before or after it.`;

// Kills the "too much talent" cliché in the nickname, dek, and body alike.
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

  const t = tierFor(wins);
  // Two user messages, one per phase. The HEADLINE one is deliberately minimal: the
  // nickname is about WHO the players are (world knowledge), so mode, tier, tone,
  // lineup values, and composition signals are dead weight — and the spacing/usage
  // signals actively feed the BANNED angles. The ARTICLE keeps the full context
  // (tier verdict + fit notes are load-bearing for its sentence 3).
  const user = phase === "article"
    ? `MODE: ${modeLabel}
FINAL RECORD: ${wins}-${losses} (82 games)
SEASON TIER: ${t[1]}
TONE DIRECTIVE: ${t[2]}
LATE-SEASON ERUPTION: ${hh ? hh.player + " caught fire down the stretch (" + hh.tier + ")" : "none"}
TEAM NICKNAME ALREADY IN PRINT: ${nickname}
ROSTER (slot / season / player / lineup value):
${players.map(p => `${p.slot} / ${p.yr} / ${p.name} / ${p.v}`).join("\n")}
COMPOSITION SIGNALS (how the five fit together):
${notes.length ? notes.map(n => "- " + n).join("\n") : "- a reasonably balanced five"}`
    : `FINAL RECORD: ${wins}-${losses}
ROSTER (season / player):
${players.map(p => `${p.yr} ${p.name}`).join("\n")}`;

  const isArticle = phase === "article";
  const voice = env.RECAP_VOICE || DEFAULT_VOICE;
  // Headline thinking is OFF by default so titles land in ~3s instead of ~15s. Bring the
  // slower, more-considered titles back by setting RECAP_HEADLINE_THINK to 1024 or more.
  const headThink = Math.max(0, parseInt(env.RECAP_HEADLINE_THINK, 10) || 0);
  const useThink = isArticle || headThink >= 1024;                 // article always thinks; headline only if dialed up
  const thinkBudget = isArticle ? 1400 : headThink;
  const maxTokens = isArticle ? 2600 : (useThink ? thinkBudget + 512 : 512);
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
      body: JSON.stringify(Object.assign({
        model: env.RECAP_MODEL || "claude-sonnet-4-6",
        max_tokens: maxTokens,
        // ARTICLE keeps the full stack (voice + BAN + HARD). HEADLINE runs lean:
        // NICKNAME_RULES already bans the ball-sharing angle, so BAN is redundant
        // there, and the default voice is noise for a 2-4 word name — a custom
        // RECAP_VOICE (dashboard) still applies to both phases when set.
        system: isArticle
          ? SYS_ARTICLE + "\n\n" + voice + "\n\n" + BAN + "\n\n" + HARD
          : SYS_HEADLINE + (env.RECAP_VOICE ? "\n\n" + env.RECAP_VOICE : "") + "\n\n" + HARD_HEAD,
        messages: [{ role: "user", content: user }]
      }, useThink ? { thinking: { type: "enabled", budget_tokens: thinkBudget } } : {}))
    });
  } catch (e) { clearTimeout(timer); return fail("timeout"); }
  clearTimeout(timer);
  if (!resp.ok) return fail("api_" + resp.status);

  try {
    const data = await resp.json();
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
    if (isArticle) {
      const raw = text.replace(/```json|```/g, "").trim();
      const out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      const article = clean(out.article, 700);
      if (!article) return fail("empty");
      return new Response(JSON.stringify({ ok: true, article, source: "api" }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    }
    // Headline: the model returns the bare nickname (see NICKNAME_RULES). Still cope if
    // it wraps the name in JSON or quotes out of habit, and take only the first line.
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

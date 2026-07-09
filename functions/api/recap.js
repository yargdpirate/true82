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

const NICKNAME_RULES = `nickname — the star of the whole page. Aim for a real locker-room nickname twisted weird: grounded more often than not, but still tilted toward the strange. Call it two parts plausible nickname, three parts mayhem. The touchstones (Banana Boat, Lob City, Grit and Grind, the Hamptons crew) all hook onto a real thing first, THEN get playful; match that.
THE HOOK (non-negotiable): grab one real, recognizable thread about THIS team and twist it. Pull from how they play (pace, passing, lockdown defense, bombing threes, sheer dominance), a standout's game, an era, or a vibe, and fuse it to an unexpected, funny, or slightly menacing image. A savvy fan should half-get the thread on hearing it, before any article explains it. Lead with a real hook, not description; keep it good-natured, never crude or mean.
NO ALLITERATION: do not match the first sounds of the words (avoid "Help-Side Hyenas", "Skip-Pass Swindlers", "Closeout Cryptids"); it reads as manufactured. Use plain, natural word pairings.
CALIBRATION:
- TOO BORING (reject): "Myth Makers", "The Titans", "The Juggernauts" — sounds like a trophy.
- TARGET: "The Repo Men", "The Three-Ball Zealots", "The Transition Wolves", "The Third-Quarter Ghosts", "The Overtime Locksmiths" — grounded enough to sound real, weird enough to grin at, and you can feel the basketball in it.
- TOO RANDOM (reel back in): "The Parking Lot Iguanas", "The Velvet Walruses", "The Damp Accountants" — noun salad with no thread; funny once, arbitrary always.
BANNED REGISTER (the "yuck" zone): do NOT reach for the epic, mythic, "great team" vibe. No Makers, Legends, Titans, Gods, Kings, Dynasty, Empire, Immortals, or Reign, and no other noble or ominous abstraction. If it sounds like a compliment or a movie trailer, throw it out.
Format: 2 to 4 words, Title Case, and PLURAL so it fits "<NICKNAME> FINISH <record>" (e.g. "The Transition Wolves Finish 74-8"); may begin with "The".
Hard bans: never the word "Five" or the numeral "5" in any form; never a real NBA franchise name; never a real player's name; no profanity.`;

const SYS_HEADLINE = `You are the creative Copy Editor naming the front-page title after the 82nd and final game of an NBA regular season. The roster is composed of several players from different historical seasons. Treat the season and record as established fact.

Return ONLY a JSON object — no markdown fences, no commentary:
{"nickname": "..."}

${NICKNAME_RULES}`;

const SYS_ARTICLE = `You are a Sports Illustrated columnist filing a short season-ending blurb after this team's 82nd and final game. The roster is real NBA players, each frozen at one specific season of his career; treat the record as established fact and write as though it were a real NBA season. The nickname is already in print, and your job is to explain it.

Return ONLY a JSON object, no markdown fences, no commentary:
{"article": "..."}

article — 3 to 4 short sentences, about 65 words total and never more than 85. Laconic and punchy: no analysis, no future outlook, no questions, no filler.
Sentence 1 is the nickname's origin and nothing else: ONE self-contained clause of no more than 15 words, stating the reason as plain fact (something the group did off the court, or the way it captures their play), committing fully, never hedging, winking, or apologizing. No "and", no "so ... that", no stacked clauses. Shape it like "Nicknamed ... because ...", using the actual nickname.
Then one or two tight sentences on the basketball: name two to four players by surname and say what they actually did on the floor, matched to the season tier and tone directive.
End on ONE laconic verdict about perfection, chosen by the final record. This is the point of the game, so keep it to a single short sentence with one small detail only:
- 82 wins (a perfect 82-0, reached any way): salute it outright, no flaw and no asterisk (e.g. "Eighty-two games, zero losses, nothing left to argue.").
- 76 to 81 wins: a narrow miss, stated with fondness, pinned on ONE small thing and nothing more — a single fair-game soft spot from the composition signals (leaky perimeter, soft frontcourt, no rim protection, thin depth) or, if none fits, one flat night (e.g. "One cold Tuesday short of perfect.").
- under 76 wins: the flaw or two that capped them all year, drawn from the composition signals, plain and unsentimental, matched to the tone directive (e.g. "The perimeter leaked all season, and the record knew it.").
Never blame spacing, shooting, or shot-sharing; if those are the only signals, keep it vague (never quite clicked) instead of naming them. Never mention ratings, models, engines, fantasy, video games, or drafting, and invent nothing beyond the nickname's origin and, at most, one flat night: no injuries, trades, or quotes. Do not use em dashes.`;

// Applied to BOTH phases (nickname + dek + body) so the whole Tribune shares one voice.
// Override live from the Cloudflare dashboard with RECAP_VOICE — no redeploy of code needed.
// To bring back the 1920s flim-flam barker, paste THIS into the RECAP_VOICE dashboard value:
//   render every word (nickname, dek, and story) in the voice of a 1920s newspaper sports barker: breathless and theatrical, thick with jazz-age slang and carnival flim-flam, fond of alliteration and big ballyhoo, gloriously over-the-top and old-timey.
const DEFAULT_VOICE = `VOICE — clean, modern Sports Illustrated sports-desk prose: vivid and confident, plain-spoken, never gimmicky or old-timey. Let the roster and the record carry it.`;

// Appended AFTER the voice so it wins on recency: the flim-flam must obey format + length.
const HARD = `FORMAT AND LENGTH OVERRIDE THE VOICE. Output ONLY the JSON object — no text before or after it, nothing outside the fields. Obey every length limit stated above exactly. If the flim-flam will not fit inside the format and the length, trim the flim-flam, never the format or the count.`;

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
        system: (isArticle ? SYS_ARTICLE : SYS_HEADLINE) + "\n\n" + voice + "\n\n" + BAN + "\n\n" + HARD,
        messages: [{ role: "user", content: user }]
      }, useThink ? { thinking: { type: "enabled", budget_tokens: thinkBudget } } : {}))
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
    const nick = clean(out.nickname, 48);
    if (!nick) return fail("empty");
    return new Response(JSON.stringify({ ok: true, nickname: nick, source: "api" }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  } catch (e) { return fail("parse"); }
}

// /api/traits — PLAYER BONUSES community voting for TRUE 82 (v47.6).
// (Internal names keep the traits_* vocabulary; the public product name,
// routes, and all end-user copy say PLAYER BONUSES per the final spec.)
//
// GET  /api/traits?op=featured
//        One curated homepage question (homepage_eligible pool, daily rotation).
//
// GET  /api/traits?op=session[&q=<question_id>][&exclude=a,b,c]
//        Serve a five-question voting session. A pinned ?q= question leads.
// GET  /api/traits?op=prompt
//        Serve one genuinely divided question for the results-screen prompt.
// GET  /api/traits?op=result&q=<question_id>
//        Consensus snapshot for one question.
// GET  /api/traits?op=labels&players=<name>~<season>,<name>~<season>...
//        Settled labels for up to 60 player-seasons per call (v47.9: the
//        classic draft pool batches one request; other ops keep the 8 cap):
//        which core traits each
//        has EARNED (qualifies) or been ruled OUT of (does_not_qualify, the
//        anti-label). Shadow-mode read for the results roster; retired traits
//        never label. Exact match on lower(player_name) + season end year.
// POST /api/traits  {op:"vote", question_id, response, source, sid}
//        Record or change one call, then settle that question's consensus
//        in the same request and return the fresh snapshot.
//
// Identity for duplicate control rides the deployed v40r2 retention layer:
// when the first-party HttpOnly t82_rid cookie is present, the voter key is a
// purpose-scoped SHA-256 of it (the raw retention id is never copied into the
// trait tables). Without the cookie (consent regions, site opt-out, cookie
// loss) the voter key falls back to a hash of the page sid: dedupe within the
// visit only, recorded as voter_class 'session' so it can be split or
// excluded later. Votes are game actions, not tracking; no region is blocked
// from playing.
//
// Fail-soft law: a missing table, failed query, or bad request returns a JSON
// body the page can render around. This endpoint can never take the game down.

const RID_COOKIE = "t82_rid";
const ID_RE = /^v1-[A-Za-z0-9-]{16,60}$/;
const QID_RE = /^[a-z0-9][a-z0-9-]{2,78}$/;
const RESPONSES = new Set(["yes", "no", "unsure"]);
const SOURCES = new Set(["home_module", "results_prompt", "direct", "link", "session", "share", "card"]);
const SESSION_SIZE = 5;

const DEFAULT_RULES = {
  min_eligible_votes: 25,
  qualify_yes_share: 0.62,
  disqualify_yes_share: 0.38,
  vote_burst_limit_10min: 40,
  vote_min_spacing_ms: 1200,
  rules_version: 1
};

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, reason: "offline" }, 200);

  // Same-origin only, same posture as /api/event.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return json({ ok: false, reason: "cross_origin" }, 200);
    } catch { return json({ ok: false, reason: "bad_origin" }, 200); }
  }

  try {
    if (request.method === "GET") return await handleGet(context);
    if (request.method === "POST") return await handleVote(context);
    return json({ ok: false, reason: "method" }, 405);
  } catch (err) {
    // A schema that has not landed yet, or any query failure, must degrade to
    // a calm JSON body. The page shows its own scoreboard error card.
    return json({ ok: false, reason: "unavailable", detail: String(err && err.message || err).slice(0, 120) }, 200);
  }
}

async function handleGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const op = url.searchParams.get("op") || "session";
  const rules = await loadRules(env.DB);

  if (op === "result") {
    const qid = cleanQid(url.searchParams.get("q"));
    if (!qid) return json({ ok: false, reason: "bad_question" }, 200);
    const question = await questionById(env.DB, qid);
    if (!question) return json({ ok: false, reason: "unknown_question" }, 200);
    const consensus = await consensusFor(env.DB, question.id, rules);
    let mine = null;
    try {
      const voter = await voterKey(request, url.searchParams.get("sid"));
      const row = await env.DB.prepare(
        `SELECT response, changed FROM trait_votes_v1 WHERE question_id = ?1 AND voter_hash = ?2`
      ).bind(question.id, voter.hash).all().then((r) => (r.results || [])[0]);
      mine = row ? row.response : null;
    } catch {}
    return json({ ok: true, question, consensus, my_response: mine,
      display: displayFor(consensus, mine, rules), rules: publicRules(rules) });
  }

  if (op === "labels") {
    // v49.5: each hit now carries its question id (q.id) so a label chip on a
    // results card can post a vote without a second lookup. Additive field;
    // older clients ignore it.
    // v47.9: cap raised to 60 for THIS op only, so the classic draft pool
    // labels in one request. The query below reads the full settled label
    // set per call regardless of pair count, so 60 pairs cost what 8 did.
    // op=roster and friends keep the 8-pair cap (they create rows per pair).
    const pairs = parsePlayerPairs(url.searchParams.get("players"), 60);
    if (!pairs.length) return json({ ok: false, reason: "bad_players" }, 200);
    const rows = await env.DB.prepare(`
      SELECT lower(q.player_name) pname, q.season season, t.display_name tname, c.status status, q.id qid
      FROM trait_consensus_v1 c
      JOIN trait_questions_v1 q ON q.id = c.question_id
      JOIN traits_v1 t ON t.id = q.trait_id
      WHERE t.status = 'core' AND c.status IN ('qualifies','does_not_qualify')`)
      .all().then((r) => r.results || []).catch(() => null);
    if (!rows) return json({ ok: false, reason: "labels_query" }, 200);
    // Editorial desk rulings (0012) fill in before community volume exists;
    // a settled COMMUNITY ruling on the same question always supersedes.
    // Table absent (0012 unapplied) degrades to community-only.
    const edRows = await env.DB.prepare(`
      SELECT lower(q.player_name) pname, q.season season, t.display_name tname, e.verdict verdict, q.id qid
      FROM trait_editorial_v1 e
      JOIN trait_questions_v1 q ON q.id = e.question_id
      JOIN traits_v1 t ON t.id = q.trait_id
      WHERE t.status = 'core' AND q.status = 'active'`)
      .all().then((r) => r.results || []).catch(() => []);
    const labels = {};
    for (const p of pairs) {
      const seen = new Set();
      const hits = rows
        .filter((r) => r.pname === p.name && Number(r.season) === p.season)
        .map((r) => { seen.add(r.tname); return { t: r.tname, anti: r.status === "does_not_qualify", id: r.qid }; });
      for (const r of edRows) {
        if (r.pname === p.name && Number(r.season) === p.season && !seen.has(r.tname)) {
          hits.push({ t: r.tname, anti: r.verdict === "does_not_qualify", e: 1, id: r.qid });
        }
      }
      if (hits.length) labels[p.name + "~" + p.season] = hits;
    }
    return json({ ok: true, labels, count: Object.keys(labels).length });
  }

  if (op === "roster") {
    // Make ANY drafted player votable (owner ruling, 2026-07-27): given the
    // five drafted name~season pairs, lazily create question rows for a
    // deterministic pair of core traits per player. Generated ids share the
    // curated id space (slug(name)-season-trait), so INSERT OR IGNORE lands
    // on the existing row when the desk already wrote one, votes pool into
    // the same consensus, and the label chips learn from roster voting.
    // Uncurated rows have no meta, so sessions, the homepage, and shares
    // never surface them; they live only on the roster that drafted them.
    // Sentences for uncurated rows are composed from per-trait templates at
    // serve time; nothing template-made is ever stored as editorial copy.
    const pairs = parsePlayerPairs(url.searchParams.get("players"));
    if (!pairs.length) return json({ ok: false, reason: "bad_players" }, 200);
    const voter = await voterKey(request, url.searchParams.get("sid"));
    const out = [];
    const now = Date.now();
    for (const p of pairs.slice(0, 5)) {
      if (!/^[a-z][a-z .'-]{1,38}$/.test(p.name)) continue;
      const nslug = p.name.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const h = hashCode(nslug + p.season);
      let tp = ROSTER_TRAITS;
      if (p.pos && p.pos.indexOf("G") === 0) tp = tp.filter((x) => x !== "rim-protector");
      else if (p.pos && p.pos.indexOf("C") >= 0 && p.pos.indexOf("G") < 0) tp = tp.filter((x) => x !== "super-three-point-shooter");
      const t1 = tp[h % tp.length];
      const t2 = tp[(Math.floor(h / 7) + 1 + (h % tp.length)) % tp.length];
      for (const tr of (t1 === t2 ? [t1] : [t1, t2])) {
        const qid = nslug + "-" + p.season + "-" + tr;
        const label = (p.season - 1) + "-" + String(p.season).slice(2);
        const title = p.name.replace(/(^|[ .'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
        try {
          await env.DB.prepare(`
            INSERT OR IGNORE INTO trait_questions_v1
              (id, trait_id, player_name, season, season_label, prompt_override, editorial_priority, status, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, NULL, 0, 'active', ?6, ?6)`)
            .bind(qid, tr, title, p.season, label, now).run();
        } catch {}
        const q = await questionById(env.DB, qid);
        if (q && q.status === "active") out.push(q);
      }
    }
    if (!out.length) return json({ ok: false, reason: "no_questions" }, 200);
    for (const q of out) {
      if (!q.public_question) {
        q.public_question = rosterQuestion(q);
        q.what_counts = q.what_counts || ROSTER_WC[q.trait_id] || q.definition || null;
        q.metadata_line = q.metadata_line || (q.player_name + " \u00b7 " + (q.season_label || q.season));
      }
    }
    try {
      const marks = out.map(() => "?").join(",");
      const mine = await env.DB.prepare(
        `SELECT question_id, response, changed FROM trait_votes_v1 WHERE voter_hash = ?1 AND question_id IN (${marks})`
      ).bind(voter.hash, ...out.map((q) => q.id)).all().then((r) => r.results || []);
      const byId = {};
      for (const m of mine) byId[m.question_id] = {
        response: m.response,
        answer_count: Math.max(1, (Number(m.changed) || 0) + 1)
      };
      for (const q of out) {
        const mineForQuestion = byId[q.id];
        q.my_response = mineForQuestion ? mineForQuestion.response : null;
        q.answer_count = mineForQuestion ? mineForQuestion.answer_count : 0;
      }
    } catch {
      for (const q of out) { q.my_response = null; q.answer_count = 0; }
    }
    // Algorithmic roster delivery obeys the same two-answer ceiling as the
    // curated feed. If every roster-specific option is exhausted, the client
    // falls back to the broader curated pool rather than forcing a third ask.
    const available = out.filter((q) => Number(q.answer_count || 0) < 2);
    if (!available.length) return json({ ok: false, reason: "roster_exhausted" }, 200);
    return json({ ok: true, questions: available, rules: publicRules(rules) });
  }

  if (op === "featured") {
    // One curated homepage question: editorially flagged pool, rotated by day
    // so the module changes between visits without ever going random-obscure.
    const pool = await env.DB.prepare(`
      SELECT q.id, m.slug, m.public_question,
             COALESCE(c.eligible_votes, 0) ev, COALESCE(c.yes_share, 0.5) ys
      FROM trait_question_meta_v1 m
      JOIN trait_questions_v1 q ON q.id = m.question_id
      JOIN traits_v1 t ON t.id = q.trait_id
      LEFT JOIN trait_consensus_v1 c ON c.question_id = q.id
      WHERE m.homepage_eligible = 1 AND m.active = 1 AND q.status = 'active'
      ORDER BY q.editorial_priority DESC, m.slug
      LIMIT 80`).all().then((r) => r.results || []).catch(() => []);
    if (!pool.length) return json({ ok: false, reason: "no_questions" }, 200);
    const day = Math.floor(Date.now() / 86400000);
    const fresh = pool.filter((p) => Number(p.ev) < 5);
    const live = pool.filter((p) => Number(p.ev) >= 5)
      .sort((a, b) => Math.abs(a.ys - 0.5) - Math.abs(b.ys - 0.5)).slice(0, 8);
    const pick = fresh.length && day % 2 === 0
      ? fresh[Math.floor(day / 2) % fresh.length]
      : live.length >= 3
        ? live[Math.floor(day / 2) % live.length]
        : pool[day % pool.length];
    return json({ ok: true, question: { id: pick.id, slug: pick.slug, public_question: pick.public_question } });
  }

  if (op === "prompt") {
    // The results screen wants ONE compact question, preferring the players
    // this user just drafted: a disputed fight about a drafted player-season
    // first, then any curated question about a drafted player, then the most
    // divided question overall, then the loudest unheard one.
    const promptCols = `q.id, q.player_name, q.season, m.slug, m.public_question,
             COALESCE(c.yes_share, 0.5) yes_share, COALESCE(c.eligible_votes, 0) eligible_votes, c.status`;
    const promptFrom = `
      FROM trait_questions_v1 q
      JOIN traits_v1 t ON t.id = q.trait_id
      JOIN trait_question_meta_v1 m ON m.question_id = q.id AND m.active = 1
      LEFT JOIN trait_consensus_v1 c ON c.question_id = q.id
      WHERE q.status = 'active'`;
    const pairs = parsePlayerPairs(url.searchParams.get("players"));
    let row = null;
    if (pairs.length) {
      const seasonClause = pairs.map(() => "(lower(q.player_name) = ? AND q.season = ?)").join(" OR ");
      const seasonBinds = pairs.flatMap((p) => [p.name, p.season]);
      row = await env.DB.prepare(
        `SELECT ${promptCols} ${promptFrom} AND (${seasonClause})
         ORDER BY CASE WHEN COALESCE(c.eligible_votes,0) >= 5 THEN ABS(COALESCE(c.yes_share,0.5) - 0.5) ELSE 0.51 END ASC,
                  q.editorial_priority DESC LIMIT 1`
      ).bind(...seasonBinds).all().then((r) => (r.results || [])[0]).catch(() => null);
      if (!row) {
        const nameClause = pairs.map(() => "lower(q.player_name) = ?").join(" OR ");
        row = await env.DB.prepare(
          `SELECT ${promptCols} ${promptFrom} AND (${nameClause})
           ORDER BY CASE WHEN COALESCE(c.eligible_votes,0) >= 5 THEN ABS(COALESCE(c.yes_share,0.5) - 0.5) ELSE 0.51 END ASC,
                    q.editorial_priority DESC LIMIT 1`
        ).bind(...pairs.map((p) => p.name)).all().then((r) => (r.results || [])[0]).catch(() => null);
      }
    }
    if (!row) {
      row = await env.DB.prepare(
        `SELECT ${promptCols} ${promptFrom} AND COALESCE(c.eligible_votes,0) >= 5
         ORDER BY ABS(COALESCE(c.yes_share,0.5) - 0.5) ASC, c.eligible_votes DESC LIMIT 1`
      ).all().then((r) => (r.results || [])[0]).catch(() => null);
    }
    if (!row) {
      row = await env.DB.prepare(
        `SELECT ${promptCols} ${promptFrom}
         ORDER BY q.editorial_priority DESC, q.id LIMIT 1`
      ).all().then((r) => (r.results || [])[0]).catch(() => null);
    }
    if (!row) return json({ ok: false, reason: "no_questions" }, 200);
    return json({
      ok: true,
      divided: Number(row.eligible_votes) >= 5 && row.status === "disputed",
      question: { id: row.id, slug: row.slug, public_question: row.public_question }
    });
  }

  // op=session — up to five questions. The same anonymous first-party
  // identity used by retention analytics also keys trait_votes_v1. The
  // existing `changed` counter means answer_count = changed + 1, so no schema
  // change is needed for the two-answer ceiling:
  //   pass 1: never answered; pass 2: answered exactly once;
  //   pass 3: answered at least twice, but ONLY after passes 1-2 are empty.
  // A direct per-question page may still show its explicitly requested item;
  // this rule governs algorithmic feeds and homepage/results recommendations.
  const voter = await voterKey(request, url.searchParams.get("sid"));
  const pinnedId = cleanQid(url.searchParams.get("q"));
  const excluded = String(url.searchParams.get("exclude") || "")
    .split(",").map(cleanQid).filter(Boolean).slice(0, 48);

  const picked = [];
  const seen = new Set(excluded);

  if (pinnedId && !seen.has(pinnedId)) {
    const pinned = await questionById(env.DB, pinnedId);
    if (pinned && pinned.status === "active" && pinned.curated) {
      const prior = await env.DB.prepare(
        `SELECT changed FROM trait_votes_v1 WHERE question_id = ?1 AND voter_hash = ?2`
      ).bind(pinned.id, voter.hash).all().then((r) => (r.results || [])[0]).catch(() => null);
      pinned.answer_count = prior ? Math.max(1, (Number(prior.changed) || 0) + 1) : 0;
      // A homepage pin is only a preference. Once answered twice it waits
      // until the entire under-two pool is exhausted like every other item.
      if (pinned.answer_count < 2) { picked.push(pinned); seen.add(pinned.id); }
    }
  }

  const tierPredicate = (tier) => tier === 0
    ? "mine.question_id IS NULL"
    : tier === 1
      ? "mine.question_id IS NOT NULL AND COALESCE(mine.changed, 0) = 0"
      : "mine.question_id IS NOT NULL AND COALESCE(mine.changed, 0) >= 1";

  async function fillTier(tier) {
    if (picked.length >= SESSION_SIZE) return;
    const skip = Array.from(seen).slice(0, 64);
    const skipSql = skip.length ? `AND q.id NOT IN (${skip.map(() => "?").join(",")})` : "";
    // v47.16 VARIETY WITH A QUALITY FLOOR: the old score carried a 0-24
    // jitter that was too weak to reorder anything against a +60 starvation
    // term, so every new voter saw the same five in the same order. Now the
    // quality ranking runs pure (priority + starvation + contested, NO
    // jitter), a pool of the top 18 is cut, and the session draws from that
    // pool at random. Every session is a different hand dealt from the same
    // strong deck; a question ranked 40th on quality can never sneak in.
    const rows = await env.DB.prepare(`
      SELECT * FROM (
        SELECT q.id, q.trait_id, q.player_name, q.season, q.season_label,
               q.prompt_override, q.status, t.display_name trait_name,
               t.short_definition definition,
               m.slug, m.public_question, m.what_counts, m.metadata_line, m.active meta_active,
               COALESCE(c.eligible_votes, 0) eligible_votes,
               COALESCE(c.yes_share, 0.5) yes_share,
               CASE WHEN mine.question_id IS NULL THEN 0 ELSE COALESCE(mine.changed, 0) + 1 END answer_count,
               ( q.editorial_priority
                 + MAX(0, 60 - COALESCE(c.eligible_votes, 0))
                 + CASE WHEN COALESCE(c.eligible_votes, 0) >= 5
                        THEN CAST(40 * (0.5 - ABS(COALESCE(c.yes_share, 0.5) - 0.5)) * 2 AS INTEGER)
                        ELSE 0 END ) score
        FROM trait_questions_v1 q
        JOIN traits_v1 t ON t.id = q.trait_id
        JOIN trait_question_meta_v1 m ON m.question_id = q.id AND m.active = 1
        LEFT JOIN trait_consensus_v1 c ON c.question_id = q.id
        LEFT JOIN trait_votes_v1 mine ON mine.question_id = q.id AND mine.voter_hash = ?
        WHERE q.status = 'active'
          AND ${tierPredicate(tier)}
          ${skipSql}
        ORDER BY score DESC
        LIMIT 18
      ) ORDER BY RANDOM()`).bind(voter.hash, ...skip).all()
      .then((r) => r.results || []).catch(() => []);
    for (const row of rows) {
      if (picked.length >= SESSION_SIZE) break;
      if (!seen.has(row.id)) { picked.push(row); seen.add(row.id); }
    }
  }

  await fillTier(0);
  await fillTier(1);
  // Do not mix third-time questions into a short final under-two session. A
  // third round begins only when ZERO eligible questions remain below two.
  if (!picked.length) await fillTier(2);

  if (!picked.length) return json({ ok: false, reason: "no_questions" }, 200);
  const finalPicks = picked.slice(0, SESSION_SIZE).map((row) => {
    const q = publicQuestion(row);
    q.answer_count = Math.max(0, Number(row.answer_count) || 0);
    return q;
  });
  try {
    const marks = finalPicks.map(() => "?").join(",");
    const mine = await env.DB.prepare(
      `SELECT question_id, response, changed FROM trait_votes_v1 WHERE voter_hash = ?1 AND question_id IN (${marks})`
    ).bind(voter.hash, ...finalPicks.map((q) => q.id)).all().then((r) => r.results || []);
    const byId = {};
    for (const m of mine) byId[m.question_id] = {
      response: m.response,
      answer_count: Math.max(1, (Number(m.changed) || 0) + 1)
    };
    for (const q of finalPicks) {
      const mineForQuestion = byId[q.id];
      q.my_response = mineForQuestion ? mineForQuestion.response : null;
      q.answer_count = mineForQuestion ? mineForQuestion.answer_count : 0;
    }
  } catch {
    for (const q of finalPicks) { q.my_response = null; q.answer_count = 0; }
  }
  return json({
    ok: true,
    voter_class: voter.klass,
    questions: finalPicks,
    rules: publicRules(rules)
  });
}

async function handleVote(context) {
  const { request, env } = context;

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 2048) return json({ ok: false, reason: "too_large" }, 200);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ ok: false, reason: "too_large" }, 200);
    body = JSON.parse(raw);
  } catch { return json({ ok: false, reason: "bad_json" }, 200); }
  if (!body || typeof body !== "object" || body.op !== "vote") return json({ ok: false, reason: "bad_op" }, 200);

  const qid = cleanQid(body.question_id);
  const response = RESPONSES.has(body.response) ? body.response : "";
  const source = SOURCES.has(body.source) ? body.source : "direct";
  if (!qid || !response) return json({ ok: false, reason: "bad_vote" }, 200);

  const question = await questionById(env.DB, qid);
  if (!question || question.status !== "active") return json({ ok: false, reason: "unknown_question" }, 200);
  const canonicalId = question.id;

  const rules = await loadRules(env.DB);
  const voter = await voterKey(request, body.sid);
  const now = Date.now();

  // Velocity fence: protects against scripts and refresh spam, never against
  // enthusiasm. A brigade of real fans each carries its own voter hash. Keyed
  // on updated_at so change-vote spam counts as activity; with a finite
  // question pool, counting only fresh rows would let a script loop forever.
  const burst = await env.DB.prepare(
    `SELECT COUNT(*) c, MAX(updated_at) latest FROM trait_votes_v1 WHERE voter_hash = ?1 AND updated_at > ?2`
  ).bind(voter.hash, now - 600000).all().then((r) => (r.results || [])[0]).catch(() => null);
  if (burst && Number(burst.c) >= rules.vote_burst_limit_10min) {
    return json({ ok: false, reason: "rate_limited" }, 200);
  }
  // Cadence fence: a hash's row count is capped by the pool, so upsert spam is
  // invisible to the burst count. Two calls from the same hash inside the
  // spacing window is a script, not a fan reading a question.
  if (burst && burst.latest != null && rules.vote_min_spacing_ms > 0 &&
      now - Number(burst.latest) < rules.vote_min_spacing_ms) {
    return json({ ok: false, reason: "rate_limited" }, 200);
  }

  // One counted call per voter per question; a repeat is a CHANGED call, which
  // the product treats as a first-class action, not an error.
  const prior = await env.DB.prepare(
    `SELECT response, changed FROM trait_votes_v1 WHERE question_id = ?1 AND voter_hash = ?2`
  ).bind(canonicalId, voter.hash).all().then((r) => (r.results || [])[0]).catch(() => null);

  await env.DB.prepare(`
    INSERT INTO trait_votes_v1
      (question_id, voter_hash, voter_class, response, source, changed, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6)
    ON CONFLICT(question_id, voter_hash) DO UPDATE SET
      response = excluded.response,
      source = excluded.source,
      changed = trait_votes_v1.changed + 1,
      updated_at = excluded.updated_at`
  ).bind(canonicalId, voter.hash, voter.klass, response, source, now).run();

  // Settle-on-write: one aggregate pass for this question, upserted so reads
  // (session ranking, prompt, result, Avocado) stay a single indexed lookup.
  const consensus = await settleQuestion(env.DB, canonicalId, rules, now);

  const outcome = prior ? (prior.response === response ? "duplicate" : "changed") : "counted";
  const answerCount = prior ? Math.max(2, (Number(prior.changed) || 0) + 2) : 1;
  return json({
    ok: true, outcome, voter_class: voter.klass, consensus,
    vote: { response, answer_count: answerCount },
    display: displayFor(consensus, response, rules)
  });
}

async function settleQuestion(db, qid, rules, now) {
  const agg = await db.prepare(`
    SELECT
      SUM(CASE WHEN response = 'yes' THEN 1 ELSE 0 END) yes_count,
      SUM(CASE WHEN response = 'no' THEN 1 ELSE 0 END) no_count,
      SUM(CASE WHEN response = 'unsure' THEN 1 ELSE 0 END) unsure_count
    FROM trait_votes_v1
    WHERE question_id = ?1 AND (abuse_state IS NULL OR abuse_state = '')`
  ).bind(qid).all().then((r) => (r.results || [])[0]) || {};

  const yes = Number(agg.yes_count) || 0;
  const no = Number(agg.no_count) || 0;
  const unsure = Number(agg.unsure_count) || 0;
  const eligible = yes + no;
  const yesShare = eligible > 0 ? yes / eligible : null;

  let status = "unresolved";
  if (eligible >= rules.min_eligible_votes && yesShare !== null) {
    if (yesShare >= rules.qualify_yes_share) status = "qualifies";
    else if (yesShare <= rules.disqualify_yes_share) status = "does_not_qualify";
    else status = "disputed";
  }

  await db.prepare(`
    INSERT INTO trait_consensus_v1
      (question_id, eligible_votes, yes_count, no_count, unsure_count, yes_share, status, rules_version, calculated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    ON CONFLICT(question_id) DO UPDATE SET
      eligible_votes = excluded.eligible_votes,
      yes_count = excluded.yes_count,
      no_count = excluded.no_count,
      unsure_count = excluded.unsure_count,
      yes_share = excluded.yes_share,
      status = excluded.status,
      rules_version = excluded.rules_version,
      calculated_at = excluded.calculated_at`
  ).bind(qid, eligible, yes, no, unsure, yesShare, status, rules.rules_version, now).run();

  return snapshot(yes, no, unsure, yesShare, status, rules);
}

async function consensusFor(db, qid, rules) {
  const row = await db.prepare(
    `SELECT yes_count, no_count, unsure_count, yes_share, status FROM trait_consensus_v1 WHERE question_id = ?1`
  ).bind(qid).all().then((r) => (r.results || [])[0]).catch(() => null);
  if (!row) return snapshot(0, 0, 0, null, "unresolved", rules);
  return snapshot(Number(row.yes_count) || 0, Number(row.no_count) || 0, Number(row.unsure_count) || 0,
    row.yes_share === null || row.yes_share === undefined ? null : Number(row.yes_share),
    row.status || "unresolved", rules);
}

function snapshot(yes, no, unsure, yesShare, status, rules) {
  const eligible = yes + no;
  return {
    yes_count: yes,
    no_count: no,
    unsure_count: unsure,
    eligible_votes: eligible,
    total_votes: eligible + unsure,
    yes_pct: eligible > 0 ? Math.round(100 * yes / eligible) : null,
    yes_share: yesShare,
    status,
    votes_needed: Math.max(0, rules.min_eligible_votes - eligible)
  };
}

function snapshotFromRow(row, rules) {
  const eligible = Number(row.eligible_votes) || 0;
  const yesShare = row.yes_share === null || row.yes_share === undefined ? null : Number(row.yes_share);
  return {
    eligible_votes: eligible,
    yes_pct: yesShare === null ? null : Math.round(100 * yesShare),
    yes_share: yesShare,
    status: row.status || "unresolved",
    votes_needed: Math.max(0, rules.min_eligible_votes - eligible)
  };
}

async function loadRules(db) {
  const out = Object.assign({}, DEFAULT_RULES);
  try {
    const rows = await db.prepare(`SELECT rule_key, rule_value FROM trait_rules_v1`).all()
      .then((r) => r.results || []);
    for (const row of rows) {
      const n = Number(row.rule_value);
      if (Number.isFinite(n) && row.rule_key in out) out[row.rule_key] = n;
    }
  } catch {}
  return out;
}

function publicRules(rules) {
  return { min_eligible_votes: rules.min_eligible_votes };
}

const ROSTER_TRAITS = ["off-court-knucklehead", "clutch", "tough-shot-maker", "iso-defender", "playmaker",
  "three-point-shooter", "team-defender", "off-ball-scorer", "rim-pressurer",
  "switchable-defender", "rim-protector", "super-three-point-shooter"];
const ROSTER_WC = {
  "iso-defender": "Handles the other team's best scorer one-on-one.",
  "team-defender": "Elite at rotations, communication, help, hands in the lane",
  "switchable-defender": "Takes the switch, guard through big, and holds up.",
  "rim-protector": "Shots die at the rim when he is standing there.",
  "playmaker": "Makes teammates way better.",
  "rim-pressurer": "Attacks the rim, gets fouled, forces packing of the paint.",
  "off-ball-scorer": "A danger with no ball: cuts, relocations, catch-and-shoot.",
  "tough-shot-maker": "Makes contested, late-clock, self-created shots.",
  "clutch": "You want the last shot in his hands. So does he.",
  "three-point-shooter": "Real 3PT volume and accuracy defenses must respect.",
  "super-three-point-shooter": "His shooting prowess breaks the normal defensive gameplan.",
  "off-court-knucklehead": "Had severe off-court issues that could threaten the team's success."
};
function rosterQuestion(q) {
  const s = q.season, name = q.player_name;
  switch (q.trait_id) {
    case "off-court-knucklehead": return "Was " + s + " " + name + " an off-court knucklehead?";
    case "clutch": return "Was " + s + " " + name + " clutch?";
    case "tough-shot-maker": return "Was " + s + " " + name + " an elite tough shot maker?";
    case "iso-defender": return "Was " + s + " " + name + " an elite iso defender?";
    case "playmaker": return "Was " + s + " " + name + " an elite playmaker?";
    case "three-point-shooter": return "Was " + s + " " + name + " a real three-point threat?";
    case "team-defender": return "Was " + s + " " + name + " an elite team defender?";
    case "off-ball-scorer": return "Was " + s + " " + name + " an elite off-ball scorer?";
    case "rim-pressurer": return "Did " + s + " " + name + " attack the rim?";
    case "switchable-defender": return "Could " + s + " " + name + " switch across positions and hold up?";
    case "rim-protector": return "Was " + s + " " + name + " an elite rim protector?";
    case "super-three-point-shooter": return "Did " + s + " " + name + " have gravity?";
  }
  return "Was " + s + " " + name + " elite?";
}
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function parsePlayerPairs(raw, cap) {
  return String(raw || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, cap || 8)
    .map((s) => {
      const parts = s.split("~");
      let pos = "";
      if (parts.length >= 3 && /^[A-Za-z-]{1,3}$/.test(parts[parts.length - 1])) {
        pos = parts.pop().toUpperCase();
      }
      if (parts.length < 2) return null;
      const season = Number(parts.pop());
      const name = parts.join("~").trim().toLowerCase();
      return name && name.length <= 60 && Number.isInteger(season) && season > 1940 && season < 2100
        ? { name, season, pos } : null;
    }).filter(Boolean);
}

// Display block for the result state (final spec section 8/22): whole-number
// percentages once the official minimum sample is met, raw counts before it.
// agree_pct is the share of voters standing with THIS voter's answer.
function displayFor(consensus, myResponse, rules) {
  const yes = consensus.yes_count || 0, no = consensus.no_count || 0, unsure = consensus.unsure_count || 0;
  const eligible = yes + no, total = eligible + unsure;
  const early = eligible < rules.min_eligible_votes;
  let agree = null;
  if (myResponse === "yes" && eligible > 0) agree = Math.round(100 * yes / eligible);
  else if (myResponse === "no" && eligible > 0) agree = Math.round(100 * no / eligible);
  else if (myResponse === "unsure" && total > 0) agree = Math.round(100 * unsure / total);
  return {
    mode: early ? "counts" : "pct",
    yes, no, unsure,
    yes_pct: eligible > 0 ? Math.round(100 * yes / eligible) : null,
    agree_pct: agree,
    status: consensus.status
  };
}

async function questionById(db, qid) {
  const row = await db.prepare(`
    SELECT q.id, q.trait_id, q.player_name, q.season, q.season_label,
           q.prompt_override, q.status, t.display_name trait_name,
           t.short_definition definition,
           m.slug, m.public_question, m.what_counts, m.metadata_line,
           m.active meta_active
    FROM trait_questions_v1 q
    JOIN traits_v1 t ON t.id = q.trait_id
    LEFT JOIN trait_question_meta_v1 m ON m.question_id = q.id
    WHERE q.id = ?1 OR m.slug = ?1`).bind(qid).all()
    .then((r) => (r.results || [])[0]).catch(() => null);
  return row ? publicQuestion(row) : null;
}

function publicQuestion(row) {
  return {
    id: row.id,
    trait_id: row.trait_id,
    trait_name: row.trait_name,
    definition: row.definition,
    player_name: row.player_name,
    season: row.season || null,
    season_label: row.season_label || (row.season ? String(row.season) : "Career"),
    prompt: row.prompt_override || null,
    status: row.status || "active",
    slug: row.slug || null,
    public_question: row.public_question || null,
    what_counts: row.what_counts || null,
    metadata_line: row.metadata_line || null,
    curated: row.slug ? (Number(row.meta_active === undefined ? 1 : row.meta_active) === 1 ? 1 : 0) : 0
  };
}

function publicQuestionRow(row) {
  return {
    id: row.id,
    player_name: row.player_name,
    season_label: row.season_label || "",
    trait_name: row.trait_name
  };
}

// Purpose-scoped voter key. The retention id itself never lands in the trait
// tables; only a one-way hash under a traits-only prefix does.
async function voterKey(request, sidRaw) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const rid = typeof cookies[RID_COOKIE] === "string" && ID_RE.test(cookies[RID_COOKIE]) ? cookies[RID_COOKIE] : "";
  if (rid) return { hash: await sha256hex("t82-traits-v1|" + rid), klass: "visitor" };
  const sid = typeof sidRaw === "string" && /^[A-Za-z0-9-]{8,64}$/.test(sidRaw) ? sidRaw : "";
  if (sid) return { hash: await sha256hex("t82-traits-sid|" + sid), klass: "session" };
  return { hash: await sha256hex("t82-traits-anon|" + Math.random().toString(36) + Date.now().toString(36)), klass: "anon" };
}

async function sha256hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCookies(raw) {
  const out = {};
  raw.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = v;
  });
  return out;
}

function cleanQid(v) {
  return typeof v === "string" && QID_RE.test(v) ? v : "";
}

function json(value, status) {
  return new Response(JSON.stringify(value), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff"
    }
  });
}

// /api/traits — Player Traits community voting for TRUE 82 (v44).
//
// GET  /api/traits?op=session[&q=<question_id>][&exclude=a,b,c]
//        Serve a five-question voting session. A pinned ?q= question leads.
// GET  /api/traits?op=prompt
//        Serve one genuinely divided question for the results-screen prompt.
// GET  /api/traits?op=result&q=<question_id>
//        Consensus snapshot for one question.
// GET  /api/traits?op=labels&players=<name>~<season>,<name>~<season>...
//        Settled labels for up to eight player-seasons: which core traits each
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
const SOURCES = new Set(["home_module", "results_prompt", "direct", "link", "session", "share"]);
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
    const consensus = await consensusFor(env.DB, qid, rules);
    return json({ ok: true, question, consensus, rules: publicRules(rules) });
  }

  if (op === "labels") {
    const raw = String(url.searchParams.get("players") || "");
    const pairs = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8)
      .map((s) => {
        const cut = s.lastIndexOf("~");
        if (cut < 1) return null;
        const name = s.slice(0, cut).trim().toLowerCase();
        const season = Number(s.slice(cut + 1));
        return name && name.length <= 60 && Number.isInteger(season) && season > 1940 && season < 2100
          ? { name, season } : null;
      }).filter(Boolean);
    if (!pairs.length) return json({ ok: false, reason: "bad_players" }, 200);
    const rows = await env.DB.prepare(`
      SELECT lower(q.player_name) pname, q.season season, t.display_name tname, c.status status
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
      SELECT lower(q.player_name) pname, q.season season, t.display_name tname, e.verdict verdict
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
        .map((r) => { seen.add(r.tname); return { t: r.tname, anti: r.status === "does_not_qualify" }; });
      for (const r of edRows) {
        if (r.pname === p.name && Number(r.season) === p.season && !seen.has(r.tname)) {
          hits.push({ t: r.tname, anti: r.verdict === "does_not_qualify", e: 1 });
        }
      }
      if (hits.length) labels[p.name + "~" + p.season] = hits;
    }
    return json({ ok: true, labels, count: Object.keys(labels).length });
  }

  if (op === "prompt") {
    // The results screen wants a genuinely divided call: enough votes to be a
    // real fight, yes-share nearest 50%. Fall back to the loudest unheard
    // question so a young database still produces a prompt.
    const disputed = await env.DB.prepare(`
      SELECT q.id, q.player_name, q.season_label, t.display_name trait_name,
             c.yes_share, c.eligible_votes, c.status
      FROM trait_questions_v1 q
      JOIN traits_v1 t ON t.id = q.trait_id
      JOIN trait_consensus_v1 c ON c.question_id = q.id
      WHERE q.status = 'active' AND c.eligible_votes >= 5
      ORDER BY ABS(COALESCE(c.yes_share, 0.5) - 0.5) ASC, c.eligible_votes DESC
      LIMIT 1`).all().then((r) => (r.results || [])[0]).catch(() => null);
    if (disputed) return json({ ok: true, divided: true, question: publicQuestionRow(disputed), consensus: snapshotFromRow(disputed, rules) });

    const fresh = await env.DB.prepare(`
      SELECT q.id, q.player_name, q.season_label, t.display_name trait_name
      FROM trait_questions_v1 q
      JOIN traits_v1 t ON t.id = q.trait_id
      WHERE q.status = 'active'
      ORDER BY q.editorial_priority DESC, q.id
      LIMIT 1`).all().then((r) => (r.results || [])[0]).catch(() => null);
    if (!fresh) return json({ ok: false, reason: "no_questions" }, 200);
    return json({ ok: true, divided: false, question: publicQuestionRow(fresh) });
  }

  // op=session — five questions, pinned direct link first, then a ranked mix
  // of editorial priority, under-voted bonus, and controversy bonus, skipping
  // what this voter already answered until the pool runs thin.
  const voter = await voterKey(request, url.searchParams.get("sid"));
  const pinnedId = cleanQid(url.searchParams.get("q"));
  const excluded = String(url.searchParams.get("exclude") || "")
    .split(",").map(cleanQid).filter(Boolean).slice(0, 24);

  const picked = [];
  const seen = new Set(excluded);

  if (pinnedId && !seen.has(pinnedId)) {
    const pinned = await questionById(env.DB, pinnedId);
    if (pinned && pinned.status === "active") { picked.push(pinned); seen.add(pinnedId); }
  }

  const rankSql = (skipAnswered) => `
    SELECT q.id, q.trait_id, q.player_name, q.season, q.season_label,
           q.prompt_override, q.status, t.display_name trait_name,
           t.short_definition definition,
           COALESCE(c.eligible_votes, 0) eligible_votes,
           COALESCE(c.yes_share, 0.5) yes_share,
           ( q.editorial_priority
             + MAX(0, 60 - COALESCE(c.eligible_votes, 0))
             + CASE WHEN COALESCE(c.eligible_votes, 0) >= 5
                    THEN CAST(40 * (0.5 - ABS(COALESCE(c.yes_share, 0.5) - 0.5)) * 2 AS INTEGER)
                    ELSE 0 END
             + (ABS(RANDOM()) % 25) ) score
    FROM trait_questions_v1 q
    JOIN traits_v1 t ON t.id = q.trait_id
    LEFT JOIN trait_consensus_v1 c ON c.question_id = q.id
    WHERE q.status = 'active'
      ${skipAnswered ? "AND NOT EXISTS (SELECT 1 FROM trait_votes_v1 v WHERE v.question_id = q.id AND v.voter_hash = ?1)" : ""}
    ORDER BY score DESC
    LIMIT 24`;

  const firstPass = await env.DB.prepare(rankSql(true)).bind(voter.hash).all()
    .then((r) => r.results || []).catch(() => []);
  for (const row of firstPass) {
    if (picked.length >= SESSION_SIZE) break;
    if (!seen.has(row.id)) { picked.push(row); seen.add(row.id); }
  }

  if (picked.length < SESSION_SIZE) {
    // Pool ran thin for this voter: revoting is allowed, refill from everything.
    const secondPass = await env.DB.prepare(rankSql(false)).all()
      .then((r) => r.results || []).catch(() => []);
    for (const row of secondPass) {
      if (picked.length >= SESSION_SIZE) break;
      if (!seen.has(row.id)) { picked.push(row); seen.add(row.id); }
    }
  }

  if (!picked.length) return json({ ok: false, reason: "no_questions" }, 200);
  return json({
    ok: true,
    voter_class: voter.klass,
    questions: picked.slice(0, SESSION_SIZE).map(publicQuestion),
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
    `SELECT response FROM trait_votes_v1 WHERE question_id = ?1 AND voter_hash = ?2`
  ).bind(qid, voter.hash).all().then((r) => (r.results || [])[0]).catch(() => null);

  await env.DB.prepare(`
    INSERT INTO trait_votes_v1
      (question_id, voter_hash, voter_class, response, source, changed, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6)
    ON CONFLICT(question_id, voter_hash) DO UPDATE SET
      response = excluded.response,
      source = excluded.source,
      changed = trait_votes_v1.changed + 1,
      updated_at = excluded.updated_at`
  ).bind(qid, voter.hash, voter.klass, response, source, now).run();

  // Settle-on-write: one aggregate pass for this question, upserted so reads
  // (session ranking, prompt, result, Avocado) stay a single indexed lookup.
  const consensus = await settleQuestion(env.DB, qid, rules, now);

  const outcome = prior ? (prior.response === response ? "duplicate" : "changed") : "counted";
  return json({ ok: true, outcome, voter_class: voter.klass, consensus });
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

async function questionById(db, qid) {
  const row = await db.prepare(`
    SELECT q.id, q.trait_id, q.player_name, q.season, q.season_label,
           q.prompt_override, q.status, t.display_name trait_name,
           t.short_definition definition
    FROM trait_questions_v1 q
    JOIN traits_v1 t ON t.id = q.trait_id
    WHERE q.id = ?1`).bind(qid).all()
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
    status: row.status || "active"
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

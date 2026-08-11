// POST /api/event — first-party event ingestion -> D1.
// No cookies, account id, fingerprint, raw IP, full referrer path, raw
// User-Agent, or durable visitor id is stored in this stream. The retired v43
// visitor_id/local_day branch is gone: durable retention identity lives only
// in the isolated /api/retention stream (v40r2). Bind D1 as DB. Inserts fail
// soft through v40/v3/v2/legacy schemas.

const NAMES = new Set([
  "session_start", "session_heartbeat", "session_end", "first_interaction", "home_view", "mode_impression", "mode_select", "feature_select",
  "return_profile", "identity_status", "referral_open", "data_ready", "data_error", "perf_summary", "client_error",
  "ui_click", "link_out", "daily_gate_view", "daily_gate_action", "daily_gate_start", "daily_gate_exit",
  "rules_open", "rules_close", "game_start", "round_advance", "deal_view", "search_use",
  "sort_change", "player_select", "pick_denied", "year_change", "draft_pick", "lineup_change",
  "reroll", "game_complete", "results_view", "result_section_view", "run_abandon", "replay", "share_click", "share",
  "share_result", "share_cancel", "share_error", "percentile_result", "percentile_error",
  "heatcheck_shown", "heatcheck_action", "heatcheck_declined", "heatcheck_result",
  "traits_session", "traits_question", "traits_vote", "traits_vote_error", "difficulty_select",
  "donate_click", "feedback_click", "recap_presented", "recap_shown", "recap_read", "recap_full_read",
  "recap_action", "recap_skip", "recap_unwrap", "recap_results", "recap_generation", "recap_publish"
]);
const MODES = new Set(["classic", "pro", "cap", "kaman"]);
const VIEWPORTS = new Set(["sm", "md", "lg"]);
const DEVICES = new Set(["mobile", "tablet", "desktop"]);
const ABANDON_REASONS = new Set(["start_over", "page_exit"]);
const SLOTS = new Set(["G", "F", "C"]);

const LEGACY_FIELDS = [
  "ts", "sid", "name", "mode", "round", "wins", "net", "undefeated", "budget_used", "roster_value",
  "segment", "variant", "pulled", "hit_82", "duration", "games_played", "max_round", "load_ms",
  "referrer", "device", "country", "viewport"
];
const V2_FIELDS = LEGACY_FIELDS.concat([
  "run_id", "reason", "franchise", "decade", "player_spend", "reroll_spend"
]);
const V3_FIELDS = V2_FIELDS.concat([
  "build", "page", "entry", "surface", "action", "outcome", "source", "host", "challenge",
  "daily_num", "ordinal", "slot", "player", "season", "amount", "value", "engaged_ms",
  "active_days", "streak", "days_since_last", "campaign_source", "campaign_medium", "campaign_name",
  "campaign_content", "nav_type", "error_code", "http_status", "detail", "ttfb_ms", "lcp_ms",
  "cls", "inp_ms", "elapsed_ms", "official", "practice", "target_wins", "target_net", "result_delta",
  "visible_ms", "interaction_count", "search_count", "share_intents", "share_completions", "scroll_pct",
  "browser", "os", "language", "local_hour", "connection", "screen"
]);
// v40: the Scoring Card rides every game_complete — all engine taxes plus
// the spacing bonus. Same additive-tier law as v3: insert tries v40 first
// and falls back cleanly when migration 0007 has not been applied yet.
const V40_FIELDS = V3_FIELDS.concat([
  "t_usage", "t_spacing", "b_spacing", "t_backd", "t_wingd",
  "t_rim", "t_glass", "t_creator", "t_age"
]);
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("method", { status: 405 });
  if (!env.DB) return noContent("off");

  // Analytics is same-origin only. This protects the private event stream from
  // casual third-party POST spam without creating a client token or identifier.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return noContent("cross-origin");
    } catch { return noContent("bad-origin"); }
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 16384) return noContent("too-large");
  let raw, b;
  try {
    raw = await request.text();
    if (raw.length > 16384) return noContent("too-large");
    b = JSON.parse(raw);
  } catch { return noContent("bad-json"); }
  if (!b || typeof b !== "object" || Array.isArray(b) || !NAMES.has(b.name) ||
      typeof b.sid !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(b.sid)) {
    return noContent("bad-event");
  }

  const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const int = (v) => { const n = num(v); return n === null ? null : Math.trunc(n); };
  const bit = (v) => (v === true || v === 1 || v === "1" ? 1 : (v === false || v === 0 || v === "0" ? 0 : null));
  const clamp = (n, lo, hi) => (n === null ? null : Math.max(lo, Math.min(hi, n)));
  const str = (v, set, max) => {
    if (typeof v !== "string") return null;
    const clean = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (!clean) return null;
    if (set && !set.has(clean)) return null;
    return clean.slice(0, max || 64);
  };
  const slug = (v, max = 80) => {
    const s = str(v, null, max);
    return s && /^[A-Za-z0-9_.:/+\- ]+$/.test(s) ? s : null;
  };
  const referrerOrigin = (v) => {
    if (typeof v !== "string" || !v) return null;
    try {
      const u = new URL(v);
      return (u.protocol === "http:" || u.protocol === "https:") ? u.origin.slice(0, 160) : null;
    } catch { return null; }
  };

  const ua = request.headers.get("user-agent") || "";
  const device = /Tablet|iPad/i.test(ua) ? "tablet" : (/Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop");
  const browser = /Edg\//i.test(ua) ? "Edge"
    : /OPR\//i.test(ua) ? "Opera"
    : /SamsungBrowser\//i.test(ua) ? "Samsung"
    : /CriOS\//i.test(ua) ? "Chrome iOS"
    : /FxiOS\//i.test(ua) ? "Firefox iOS"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Safari\//i.test(ua) ? "Safari" : "Other";
  const os = /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Android/i.test(ua) ? "Android"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS"
    : /Windows/i.test(ua) ? "Windows"
    : /Linux/i.test(ua) ? "Linux" : "Other";
  const country = (request.cf && request.cf.country) || null;

  const r = {
    ts: Date.now(),
    sid: b.sid.slice(0, 64),
    name: b.name,
    mode: str(b.mode, MODES, 16),
    round: clamp(int(b.round), 0, 5),
    wins: clamp(int(b.wins), 0, 82),
    net: clamp(num(b.net), -100, 100),
    undefeated: bit(b.undefeated),
    budget_used: clamp(int(b.budget_used), 0, 1000),
    roster_value: clamp(int(b.roster_value), 0, 1000),
    segment: str(b.segment, null, 48),
    variant: str(b.variant, null, 100),
    pulled: bit(b.pulled),
    hit_82: bit(b.hit_82),
    duration: clamp(int(b.duration), 0, 86400000),
    games_played: clamp(int(b.games_played), 0, 1000),
    max_round: clamp(int(b.max_round), 0, 5),
    load_ms: clamp(int(b.load_ms), 0, 600000),
    referrer: referrerOrigin(b.referrer),
    device: DEVICES.has(device) ? device : "desktop",
    country: country ? String(country).slice(0, 2) : null,
    viewport: str(b.viewport, VIEWPORTS, 4),

    run_id: str(b.run_id, null, 64),
    reason: str(b.reason, ABANDON_REASONS, 24),
    franchise: str(b.franchise, null, 80),
    decade: clamp(int(b.decade), 1940, 2030),
    player_spend: clamp(int(b.player_spend), 0, 1000),
    reroll_spend: clamp(int(b.reroll_spend), 0, 1000),

    build: slug(b.build, 32),
    page: slug(b.page, 80),
    entry: slug(b.entry, 48),
    surface: slug(b.surface, 64),
    action: slug(b.action, 80),
    outcome: slug(b.outcome, 64),
    source: str(b.source, null, 100),
    host: slug(b.host, 100),
    challenge: slug(b.challenge, 80),
    daily_num: clamp(int(b.daily_num), 0, 100000),
    ordinal: clamp(int(b.ordinal), 0, 10000),
    slot: str(b.slot, SLOTS, 1),
    player: str(b.player, null, 100),
    season: clamp(int(b.season), 1940, 2100),
    amount: clamp(num(b.amount), -1000000, 1000000),
    value: clamp(num(b.value), -1000000, 1000000),
    engaged_ms: clamp(int(b.engaged_ms), 0, 86400000),
    active_days: clamp(int(b.active_days), 0, 10000),
    streak: clamp(int(b.streak), 0, 10000),
    days_since_last: clamp(int(b.days_since_last), 0, 10000),
    campaign_source: slug(b.campaign_source, 80),
    campaign_medium: slug(b.campaign_medium, 80),
    campaign_name: slug(b.campaign_name, 100),
    campaign_content: slug(b.campaign_content, 100),
    nav_type: slug(b.nav_type, 24),
    error_code: slug(b.error_code, 80),
    http_status: clamp(int(b.http_status), 0, 599),
    detail: str(b.detail, null, 240),
    ttfb_ms: clamp(int(b.ttfb_ms), 0, 600000),
    lcp_ms: clamp(int(b.lcp_ms), 0, 600000),
    cls: clamp(num(b.cls), 0, 1000),
    inp_ms: clamp(int(b.inp_ms), 0, 600000),
    elapsed_ms: clamp(int(b.elapsed_ms), 0, 86400000),
    official: bit(b.official),
    practice: bit(b.practice),
    target_wins: clamp(int(b.target_wins), 0, 82),
    target_net: clamp(num(b.target_net), -100, 100),
    result_delta: clamp(int(b.result_delta), -82, 82),
    visible_ms: clamp(int(b.visible_ms), 0, 86400000),
    interaction_count: clamp(int(b.interaction_count), 0, 100000),
    search_count: clamp(int(b.search_count), 0, 100000),
    share_intents: clamp(int(b.share_intents), 0, 100000),
    share_completions: clamp(int(b.share_completions), 0, 100000),
    scroll_pct: clamp(int(b.scroll_pct), 0, 100),
    browser,
    os,
    language: str(b.language, null, 16),
    local_hour: clamp(int(b.local_hour), 0, 23),
    connection: slug(b.connection, 24),
    screen: slug(b.screen, 48),
    t_usage: clamp(num(b.t_usage), 0, 50),
    t_spacing: clamp(num(b.t_spacing), 0, 50),
    b_spacing: clamp(num(b.b_spacing), 0, 50),
    t_backd: clamp(num(b.t_backd), 0, 50),
    t_wingd: clamp(num(b.t_wingd), 0, 50),
    t_rim: clamp(num(b.t_rim), 0, 50),
    t_glass: clamp(num(b.t_glass), 0, 50),
    t_creator: clamp(num(b.t_creator), 0, 50),
    t_age: clamp(num(b.t_age), 0, 50)
  };

  try {
    await insert(env.DB, V40_FIELDS, r);
    return noContent(null, "v40");
  } catch (v40Err) {
    const v40Msg = String(v40Err && v40Err.message || v40Err);
    if (!isMissingColumn(v40Msg)) return noContent(v40Msg);
  }
  try {
    await insert(env.DB, V3_FIELDS, r);
    return noContent("analytics-v40-migration-required", "v3");
  } catch (v3Err) {
    const v3Msg = String(v3Err && v3Err.message || v3Err);
    if (!isMissingColumn(v3Msg)) return noContent(v3Msg);

    try {
      await insert(env.DB, V2_FIELDS, r);
      return noContent("analytics-v3-migration-required", "v2");
    } catch (v2Err) {
      const v2Msg = String(v2Err && v2Err.message || v2Err);
      if (!isMissingColumn(v2Msg)) return noContent(v2Msg);
      try {
        await insert(env.DB, LEGACY_FIELDS, r);
        return noContent("analytics-v2-v3-migrations-required", "legacy");
      } catch (legacyErr) {
        return noContent(String(legacyErr && legacyErr.message || legacyErr));
      }
    }
  }
}

async function insert(db, fields, row) {
  const sql = `INSERT INTO events (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`;
  return db.prepare(sql).bind(...fields.map((k) => row[k] === undefined ? null : row[k])).run();
}

function isMissingColumn(msg) {
  return /no column named|has no column|no such column|table events has \d+ columns/i.test(String(msg || ""));
}

function noContent(err, schema) {
  const headers = { "cache-control": "no-store" };
  if (schema) headers["x-t82-event-schema"] = schema;
  if (err) headers["x-t82-err"] = String(err).slice(0, 120);
  return new Response(null, { status: 204, headers });
}

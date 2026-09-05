// /bonuses/<slug> — direct question routes for PLAYER BONUSES.
// Serves the static /bonuses/ shell with per-question metadata swapped in:
// the page title and Open Graph tags carry the full natural question, and a
// preload script hands the page its question so the vote controls render
// with zero extra round trips. Any failure serves the untouched shell; the
// page then resolves the slug itself through op=session. Never a 404 for a
// plausible slug: the shell always loads and degrades to a normal session.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,78}$/;
// The nine hand-cut typography previews shipped in /og/. Any slug outside
// this set keeps the brand og-image; add a PNG and a slug here to extend.
const OG_CARDS = new Set([
  "2008-kobe-elite-wing-defender", "2013-lebron-clutch",
  "2016-klay-gameplan-level-gravity", "2017-draymond-guard-true-centers",
  "2018-derozan-elite-tough-shot-maker", "2018-harden-clutch",
  "2019-playoff-p-clutch", "2023-jokic-good-rim-protector",
  "2024-luka-survive-on-the-ball"
]);

export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = String(params.slug || "");
  const shellUrl = new URL("/bonuses/", request.url);
  const shell = await env.ASSETS.fetch(new Request(shellUrl, { headers: request.headers }));
  if (!SLUG_RE.test(slug) || !env.DB) return shell;
  let html;
  try { html = await shell.text(); } catch { return env.ASSETS.fetch(new Request(shellUrl)); }
  try {
    const row = await env.DB.prepare(`
      SELECT q.id, q.trait_id, q.player_name, q.season, q.season_label, q.status,
             t.display_name trait_name, t.short_definition definition,
             m.slug, m.public_question, m.what_counts, m.metadata_line, m.share_preview
      FROM trait_question_meta_v1 m
      JOIN trait_questions_v1 q ON q.id = m.question_id
      JOIN traits_v1 t ON t.id = q.trait_id
      WHERE m.slug = ?1 AND m.active = 1 AND q.status = 'active'`)
      .bind(slug).all().then((r) => (r.results || [])[0]);
    if (row) {
      const q = String(row.public_question || "");
      const ogTitle = q + " Vote on True82.";
      const ogDesc = "One tap to vote. Community votes set lineup-fit bonuses.";
      html = html
        .replace("<title>Player Bonuses \u00b7 TRUE 82</title>", "<title>" + escapeHtml(ogTitle) + "</title>")
        .replace('content="Player Bonuses \u00b7 TRUE 82"', 'content="' + escapeAttr(ogTitle) + '"')
        .replace(/content="Vote on real basketball arguments\. Community votes set lineup-fit bonuses\."/g,
                 'content="' + escapeAttr(ogDesc) + '"')
        .replace('content="https://true82.net/og-image.png"',
          OG_CARDS.has(slug)
            ? 'content="https://true82.net/og/bonus-' + slug + '.png"'
            : 'content="https://true82.net/og-image.png"')
        .replace('<script id="t82BonusPreload"></script>',
          '<script id="t82BonusPreload">window.__T82_BONUS__=' + JSON.stringify({
            id: row.id, trait_id: row.trait_id, trait_name: row.trait_name,
            definition: row.definition, player_name: row.player_name,
            season: row.season || null, season_label: row.season_label || "",
            slug: row.slug, public_question: row.public_question,
            what_counts: row.what_counts || null, metadata_line: row.metadata_line || null,
            status: row.status, curated: 1, my_response: null
          }).replace(/</g, "\\u003c") + "</script>");
    }
  } catch {}
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

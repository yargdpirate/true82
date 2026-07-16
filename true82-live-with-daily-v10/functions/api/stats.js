// GET /api/stats — public footer stats from D1 (bind as "DB").
// Finished drafts per mode + Presti (mode 'cap') 82-0 count INCLUDING Hot Hand
// conversions: game_complete logs pre-boost wins, so a boosted 82 only exists as a
// heatcheck_result row with hit_82=1. The Hot Hand fires at exactly 81 wins, so a
// game can never appear in both sets — no double count, and presti82 <= presti.
// Fails soft like the rest of the API: zeros when unbound or on error, never a 500.

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("method", { status: 405 });
  const out = { presti: 0, classic: 0, pro: 0, presti82: 0 };
  if (!env.DB) return reply(out);

  try {
    const [modes, hh] = await Promise.all([
      env.DB.prepare(
        `SELECT mode, COUNT(*) c, SUM(COALESCE(undefeated,0)) u
           FROM events
          WHERE name='game_complete' AND mode IN ('cap','classic','pro')
          GROUP BY mode`
      ).all(),
      env.DB.prepare(
        `SELECT COUNT(*) c FROM events
          WHERE name='heatcheck_result' AND mode='cap' AND hit_82=1`
      ).first()
    ]);
    (modes.results || []).forEach((r) => {
      if (r.mode === "cap") { out.presti = +r.c || 0; out.presti82 += +r.u || 0; }
      else if (r.mode === "classic") out.classic = +r.c || 0;
      else if (r.mode === "pro") out.pro = +r.c || 0;
    });
    out.presti82 += (hh && +hh.c) || 0;
  } catch (e) { /* keep zeros — the footer just shows the contact line */ }

  return reply(out);
}

function reply(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

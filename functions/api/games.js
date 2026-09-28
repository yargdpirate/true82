export async function onRequest(context) {
  const { request, env } = context;
  const KEY = "count";
  if (!env.GAMES) return reply(0);   // KV not bound yet -> report 0 instead of a 500 that spams errors
  if (request.method === "POST") {
    const n = parseInt((await env.GAMES.get(KEY)) || "0", 10) + 1;
    if (!(context.data && context.data.mockDb)) await env.GAMES.put(KEY, String(n));   // v60: a test server's game is not counted (_middleware.js)
    return reply(n);
  }
  return reply(parseInt((await env.GAMES.get(KEY)) || "0", 10));
}

function reply(count) {
  return new Response(JSON.stringify({ count }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

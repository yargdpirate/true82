// functions/lab-proxy.js
// TEST LANE ONLY. Do not merge to main. Do not link from anywhere.
//
// Requires two encrypted environment variables on the Pages environment
// that serves the test branch:
//   ANTHROPIC_KEY  - Anthropic API key (server-side only)
//   LAB_SECRET     - any random string; the lab page sends it as the x-lab header
//
// Behavior: verifies x-lab, then forwards the request body verbatim to
// the Anthropic Messages API and streams the response back unchanged.
// Fails closed: refuses to run at all if LAB_SECRET is not configured.

export async function onRequestGet() {
  return json({ ok: true, hint: 'lab-proxy is deployed; POST only' }, 200);
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_KEY) {
    return json({ error: { message: 'lab-proxy: ANTHROPIC_KEY secret not set on this environment' } }, 500);
  }
  if (!env.LAB_SECRET) {
    return json({ error: { message: 'lab-proxy: LAB_SECRET not set; refusing to run as an open relay' } }, 500);
  }
  if (request.headers.get('x-lab') !== env.LAB_SECRET) {
    return json({ error: { message: 'lab-proxy: bad or missing x-lab secret' } }, 401);
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: await request.text()
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': 'application/json' }
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

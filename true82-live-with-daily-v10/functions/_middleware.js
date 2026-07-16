// Markdown for Agents — content negotiation at the origin (works on any plan).
// Contract mirrors Cloudflare's zone feature (developers.cloudflare.com/
// fundamentals/reference/markdown-for-agents/): a GET/HEAD with
// `Accept: ... text/markdown ...` on a public page returns the hand-written
// markdown rendering with `Content-Type: text/markdown; charset=utf-8`,
// `Vary: Accept`, an estimated `x-markdown-tokens`, and OUR Content-Signal
// (ai-train=no — Cloudflare's native default says yes, which is not our policy).
// Browsers never send text/markdown, so the human site is untouched. If the
// zone's native Markdown for Agents is ever enabled it composes safely: it only
// converts text/html responses, and these are already text/markdown.
// _routes.json scopes this middleware to the five pages + existing API routes,
// so static assets (site_data.json, app.js, ...) never pay a Worker invocation.
const MD_PAGES = {
  "/": "/md/index.md",
  "/faq/": "/md/faq.md",
  "/how-it-works/": "/md/how-it-works.md",
  "/what-is-bpm/": "/md/what-is-bpm.md",
  "/can-you-go-82-0/": "/md/can-you-go-82-0.md"
};

export async function onRequest(context) {
  const { request, env, next } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return next();
  const accept = request.headers.get("accept") || "";
  if (accept.indexOf("text/markdown") === -1) return next();

  const url = new URL(request.url);
  let path = url.pathname;
  if (!MD_PAGES[path] && MD_PAGES[path + "/"]) path += "/";   // /faq -> /faq/
  const mdPath = MD_PAGES[path];
  if (!mdPath) return next();

  const asset = await env.ASSETS.fetch(new URL(mdPath, url.origin));
  if (!asset.ok) return next();                                // fail-soft: serve HTML
  const body = await asset.text();
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "vary": "accept",
      "x-markdown-tokens": String(Math.ceil(body.length / 4)),  // estimate, like the CF feature
      "content-signal": "search=yes, ai-input=yes, ai-train=no",
      "cache-control": "public, max-age=3600"
    }
  });
}

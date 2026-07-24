// GET /api/identity — same-browser retention storage policy for TRUE 82.
// Sets no cookie, stores nothing, and does not expose the visitor's location.

const CONSENT_REGIONS = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO",
  "GB","CH"
]);

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "GET") return new Response("method", { status: 405 });

  const gpc = request.headers.get("sec-gpc") === "1";
  const dnt = /^(1|yes)$/i.test(request.headers.get("dnt") || "");
  const country = String((request.cf && request.cf.country) || "").toUpperCase();

  let persistent = false;
  let reason = "unknown_region";
  if (gpc || dnt) reason = "privacy_signal";
  else if (!country || country === "XX" || country === "T1") reason = "unknown_region";
  else if (CONSENT_REGIONS.has(country)) reason = "consent_region";
  else {
    persistent = true;
    reason = "eligible";
  }

  return new Response(JSON.stringify({ persistent, reason, max_age_days: 180 }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff"
    }
  });
}

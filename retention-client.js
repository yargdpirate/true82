/* TRUE 82 v40 aggressive first-party retention client.
   Load after analytics.js and before app.js.

   Uses a random TRUE 82-only browser id. The server-set first-party cookie is
   primary; localStorage is a same-site fallback/cache for browsers that do not
   retain the cookie. No fingerprint, IP-derived id, ad id, account, or third
   party is used. Consent regions and the explicit TRUE 82 opt-out remain off.
*/
(function () {
  "use strict";
  if (typeof window === "undefined" || window.__t82RetentionLoaded) return;
  window.__t82RetentionLoaded = true;

  var POLICY_ENDPOINT = "/api/identity";
  var EVENT_ENDPOINT = "/api/retention";
  var STORAGE_KEY = "t82_anon_retention_v1";
  var OPTOUT_KEY = "t82_retention_optout_v1";
  var MAX_AGE_MS = 400 * 86400000;
  var state = "pending";
  var reason = "pending";
  var visitorId = "";
  var identitySource = "none";
  var queued = [];
  var policyGeneration = 0;
  var originalTrack = typeof window.t82track === "function" ? window.t82track : null;
  var lastShareSig = "";
  var lastShareAt = 0;
  var signals = {
    gpc: navigator.globalPrivacyControl === true,
    dnt: /^(1|yes)$/i.test(String(navigator.doNotTrack || window.doNotTrack || ""))
  };

  function token(value, max) {
    var s = value == null ? "" : String(value);
    s = s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    return s.slice(0, max || 80);
  }

  function uid(prefix) {
    var raw = "";
    try { raw = window.crypto && crypto.randomUUID ? crypto.randomUUID() : ""; } catch (e) {}
    if (!raw) raw = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    return prefix + "-" + raw.replace(/[^A-Za-z0-9-]/g, "").slice(0, 60);
  }

  function localDay() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function debugContext() {
    try { return typeof window.t82AnalyticsDebug === "function" ? (window.t82AnalyticsDebug() || {}) : {}; }
    catch (e) { return {}; }
  }

  function gameContext() {
    try { return typeof window.t82AnalyticsContext === "function" ? (window.t82AnalyticsContext() || {}) : {}; }
    catch (e) { return {}; }
  }

  function landingEntry() {
    try {
      var u = new URL(location.href);
      if (u.searchParams.get("challenge") || u.searchParams.get("beat") || u.searchParams.get("c")) return "challenge_link";
      if (u.searchParams.get("daily") || location.hash.indexOf("daily") >= 0) return "daily_link";
      if (u.searchParams.get("utm_source")) return "campaign";
      if (document.referrer && new URL(document.referrer).origin !== location.origin) return "external_referral";
    } catch (e) {}
    return "direct";
  }

  function landingSource() {
    try { return token(new URL(location.href).searchParams.get("utm_source") || "", 80); }
    catch (e) { return ""; }
  }

  function storageWorks() {
    try {
      var k = "__t82_storage_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function siteOptedOut() {
    try { return localStorage.getItem(OPTOUT_KEY) === "1"; }
    catch (e) { return false; }
  }

  function storedIdentity(now) {
    try {
      var x = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (x && typeof x.id === "string" && /^v1-[A-Za-z0-9-]{16,60}$/.test(x.id) &&
          Number.isFinite(Number(x.created)) && Number(x.created) <= now + 86400000 &&
          now - Number(x.created) < MAX_AGE_MS) return x.id;
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    return "";
  }

  function saveIdentity(id) {
    if (!/^v1-[A-Za-z0-9-]{16,60}$/.test(String(id || ""))) return false;
    try {
      var current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      var created = current && current.id === id && Number.isFinite(Number(current.created)) ? Number(current.created) : Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: id, created: created }));
      return true;
    } catch (e) { return false; }
  }

  function clearIdentity() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    visitorId = "";
    identitySource = "none";
  }

  function allowedName(name, props) {
    if (name === "game_start" || name === "game_complete" || name === "referral_open") return name;
    if (name === "share_result" && props && props.outcome === "success") return "share_success";
    if (name === "share") return "share_success";
    return "";
  }

  function makePayload(eventName, props) {
    props = props || {};
    var dbg = debugContext();
    var ctx = gameContext();
    var mode = token(props.mode || ctx.mode || "", 16);
    var runId = token(props.run_id || ctx.run_id || (dbg.activeRun && dbg.activeRun.run_id) || (dbg.resultRun && dbg.resultRun.run_id) || "", 64);
    return {
      event_id: uid("e"),
      visitor_id: visitorId,
      local_day: localDay(),
      event_name: eventName,
      sid: token(dbg.sid || "", 64),
      run_id: runId,
      build: token(dbg.build || "v40", 32),
      mode: mode,
      entry: token(props.entry || ctx.entry || landingEntry(), 48),
      source: token(props.source || landingSource(), 80),
      daily_num: Number.isFinite(Number(props.daily_num)) ? Math.trunc(Number(props.daily_num)) : null,
      official: props.official === true || props.official === 1 || props.official === "1" ? 1 :
        (props.official === false || props.official === 0 || props.official === "0" ? 0 : null)
    };
  }

  function postNow(eventName, props) {
    if (!visitorId || state !== "enabled") return;
    var payload = makePayload(eventName, props);
    try {
      fetch(EVENT_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(function () {});
    } catch (e) {}
  }

  function enqueue(eventName, props) {
    if (state === "enabled") { postNow(eventName, props); return; }
    if (state === "disabled") return;
    if (queued.length < 32) queued.push([eventName, props || {}]);
  }

  function flush() {
    var q = queued;
    queued = [];
    if (state !== "enabled") return;
    q.forEach(function (x) { postNow(x[0], x[1]); });
  }

  function applyPolicy(enabled, why, id, source) {
    state = enabled ? "enabled" : "disabled";
    reason = token(why || (enabled ? "eligible" : "policy"), 48);
    visitorId = enabled && /^v1-[A-Za-z0-9-]{16,60}$/.test(String(id || "")) ? String(id) : "";
    identitySource = enabled ? token(source || "unknown", 32) : "none";
    if (enabled && visitorId) saveIdentity(visitorId);
    if (!enabled) queued = [];
    if (state === "enabled" && visitorId) {
      postNow("visit", { entry: landingEntry(), source: landingSource() });
      flush();
    } else if (enabled) {
      state = "disabled";
      reason = "identity_unavailable";
      queued = [];
    }
  }

  function policyHeaders(existing, storageOk) {
    var dbg = debugContext();
    var h = {
      "accept": "application/json",
      "x-t82-local-day": localDay(),
      "x-t82-storage": storageOk ? "ok" : "blocked",
      "x-t82-gpc": signals.gpc ? "1" : "0",
      "x-t82-dnt": signals.dnt ? "1" : "0"
    };
    if (existing) h["x-t82-local-id"] = existing;
    if (dbg.sid) h["x-t82-sid"] = token(dbg.sid, 64);
    return h;
  }

  function initPolicy() {
    var generation = ++policyGeneration;
    if (siteOptedOut()) {
      applyPolicy(false, "site_opt_out", "", "none");
      try {
        fetch(POLICY_ENDPOINT, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "optout" })
        }).catch(function () {});
      } catch (e) {}
      return;
    }

    state = "pending";
    reason = "pending";
    var ok = storageWorks();
    var existing = storedIdentity(Date.now());
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
      if (generation === policyGeneration) applyPolicy(false, "policy_timeout", "", "none");
    }, 2500);

    try {
      fetch(POLICY_ENDPOINT, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: policyHeaders(existing, ok),
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        if (!res.ok) throw new Error("identity_http_" + res.status);
        return res.json();
      }).then(function (x) {
        if (generation !== policyGeneration) return;
        clearTimeout(timer);
        applyPolicy(!!(x && x.persistent), x && x.reason, x && x.visitor_id, x && x.identity_source);
      }).catch(function () {
        if (generation !== policyGeneration) return;
        clearTimeout(timer);
        applyPolicy(false, "policy_unavailable", "", "none");
      });
    } catch (e) {
      clearTimeout(timer);
      if (generation === policyGeneration) applyPolicy(false, "policy_unavailable", "", "none");
    }
  }

  function wrapTrack() {
    if (!originalTrack) return;
    window.t82track = function (name, props) {
      var result = originalTrack.apply(this, arguments);
      var retainedName = allowedName(name, props || {});
      if (retainedName === "share_success") {
        var p = props || {};
        var sig = token((p.run_id || "") + "|" + (p.action || p.source || "") + "|" + (p.surface || ""), 180);
        var now = Date.now();
        if (sig === lastShareSig && now - lastShareAt < 5000) return result;
        lastShareSig = sig;
        lastShareAt = now;
      }
      if (retainedName) enqueue(retainedName, props || {});
      return result;
    };
  }

  window.t82RetentionDebug = function () {
    return {
      state: state,
      reason: reason,
      visitorIdPresent: !!visitorId,
      identitySource: identitySource,
      queuedEvents: queued.length,
      localDay: localDay(),
      endpoint: EVENT_ENDPOINT,
      privacySignalsObserved: { gpc: signals.gpc, dnt: signals.dnt },
      localStorageAvailable: storageWorks(),
      siteOptOut: siteOptedOut()
    };
  };

  window.t82RetentionOptOut = function () {
    try { localStorage.setItem(OPTOUT_KEY, "1"); } catch (e) {}
    clearIdentity();
    applyPolicy(false, "site_opt_out", "", "none");
    try {
      return fetch(POLICY_ENDPOINT, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "optout" })
      }).then(function () { return window.t82RetentionDebug(); });
    } catch (e) { return Promise.resolve(window.t82RetentionDebug()); }
  };

  window.t82RetentionOptIn = function () {
    try { localStorage.removeItem(OPTOUT_KEY); } catch (e) {}
    initPolicy();
    return window.t82RetentionDebug();
  };

  wrapTrack();
  initPolicy();
})();

/* TRUE 82 v40 companion retention client.
   This file is intentionally independent from analytics.js and app.js.
   Load it after analytics.js and before app.js.

   No cookie, account, fingerprint, IP-derived id, advertising id, or third-party
   tracker is used. In eligible regions, one random first-party browser id is
   stored for up to 180 days solely to measure same-browser return behavior.
*/
(function () {
  "use strict";
  if (typeof window === "undefined" || window.__t82RetentionLoaded) return;
  window.__t82RetentionLoaded = true;

  var POLICY_ENDPOINT = "/api/identity";
  var EVENT_ENDPOINT = "/api/retention";
  var STORAGE_KEY = "t82_anon_retention_v1";
  var MAX_AGE_MS = 180 * 86400000;
  var state = "pending";
  var reason = "pending";
  var visitorId = "";
  var queued = [];
  var settled = false;
  var originalTrack = typeof window.t82track === "function" ? window.t82track : null;
  var lastShareSig = "";
  var lastShareAt = 0;

  function token(value, max) {
    var s = value == null ? "" : String(value);
    s = s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    return s.slice(0, max || 80);
  }

  function uid(prefix) {
    var raw = "";
    try {
      raw = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "";
    } catch (e) {}
    if (!raw) raw = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    return prefix + "-" + raw.replace(/[^A-Za-z0-9-]/g, "").slice(0, 60);
  }

  function localDay() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function debugContext() {
    try {
      return typeof window.t82AnalyticsDebug === "function" ? (window.t82AnalyticsDebug() || {}) : {};
    } catch (e) { return {}; }
  }

  function gameContext() {
    try {
      return typeof window.t82AnalyticsContext === "function" ? (window.t82AnalyticsContext() || {}) : {};
    } catch (e) { return {}; }
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
    try {
      var u = new URL(location.href);
      return token(u.searchParams.get("utm_source") || "", 80);
    } catch (e) { return ""; }
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

  function loadOrCreateIdentity() {
    var now = Date.now();
    var existing = storedIdentity(now);
    if (existing) return existing;
    try {
      var fresh = { id: uid("v1"), created: now };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh.id;
    } catch (e) { return ""; }
  }

  function allowedName(name, props) {
    if (name === "game_start" || name === "game_complete" || name === "referral_open") return name;
    if (name === "share_result" && props && props.outcome === "success") return "share_success";
    // v40 emits legacy `share` alongside the newer result event. Dedupe below.
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
    if (!visitorId) return;
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
    if (settled) {
      if (state === "enabled") postNow(eventName, props);
      return;
    }
    if (queued.length < 24) queued.push([eventName, props || {}]);
  }

  function flush() {
    var q = queued;
    queued = [];
    if (state !== "enabled") return;
    q.forEach(function (x) { postNow(x[0], x[1]); });
  }

  function settle(enabled, why) {
    if (settled) return;
    settled = true;
    state = enabled ? "enabled" : "disabled";
    reason = token(why || (enabled ? "eligible" : "policy"), 48);
    visitorId = enabled ? loadOrCreateIdentity() : "";
    if (enabled && !visitorId) {
      state = "disabled";
      reason = "storage_unavailable";
    }
    if (state === "enabled") enqueue("visit", { entry: landingEntry(), source: landingSource() });
    flush();
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

  function initPolicy() {
    var dnt = String(navigator.doNotTrack || window.doNotTrack || "").toLowerCase();
    if (navigator.globalPrivacyControl === true || dnt === "1" || dnt === "yes") {
      settle(false, "privacy_signal");
      return;
    }
    var timer = setTimeout(function () { settle(false, "policy_timeout"); }, 1500);
    try {
      fetch(POLICY_ENDPOINT, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "accept": "application/json" }
      }).then(function (res) {
        if (!res.ok) throw new Error("identity_http_" + res.status);
        return res.json();
      }).then(function (x) {
        clearTimeout(timer);
        settle(!!(x && x.persistent), x && x.reason);
      }).catch(function () {
        clearTimeout(timer);
        settle(false, "policy_unavailable");
      });
    } catch (e) {
      clearTimeout(timer);
      settle(false, "policy_unavailable");
    }
  }

  window.t82RetentionDebug = function () {
    return {
      state: state,
      reason: reason,
      visitorIdPresent: !!visitorId,
      queuedEvents: queued.length,
      localDay: localDay(),
      endpoint: EVENT_ENDPOINT
    };
  };

  wrapTrack();
  initPolicy();
})();

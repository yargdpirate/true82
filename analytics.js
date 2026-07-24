/* TRUE 82 — privacy-maximal first-party analytics client (v3).
   Analytics itself uses no cookies, localStorage, sessionStorage, fingerprint,
   advertising id, raw IP, or durable browser identifier. The only ids are
   random in-memory visit/run ids that disappear on reload or tab close.

   The game separately keeps The Daily's official result/streak in localStorage
   so that feature can work. v3 may report coarse COUNTS derived from that
   already-existing game state (for example, "3 active Daily days") but never
   sends the stored dates, lineup, nonce, or any durable id.

   v3 adds:
   - build / landing / campaign attribution on every event;
   - active-time and page-performance summaries;
   - client-error telemetry with aggressively scrubbed messages;
   - stable UI-control and outbound-link events;
   - richer in-memory run summaries without extra device storage.
*/
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  var ENDPOINT = "/api/event";
  var ANALYTICS_BUILD = "v40";
  var sid = uid("s");
  var startTs = Date.now();
  var visibleSince = document.visibilityState === "hidden" ? 0 : startTs;
  var visibleMs = 0;
  var engagedMs = 0;
  var lastEngagedTick = visibleSince ? startTs : 0;
  var lastActivityAt = visibleSince ? startTs : 0;
  var ENGAGED_IDLE_MS = 30000;
  var ended = false;
  var perfSent = false;
  var errorCount = 0;
  var maxErrors = 8;
  var heartbeatTimer = 0;
  var lastHeartbeatAt = startTs;
  var lastHeartbeatClicks = 0;
  var maxScrollPct = 0;
  var firstInteractionSent = false;
  var lastSchema = "";
  var lastIngestError = "";

  // Session aggregates. These remain in memory and are written once on exit.
  var gamesPlayed = 0;
  var maxRound = 0;
  var uiClicks = 0;
  var externalClicks = 0;
  var shareIntents = 0;
  var completedShares = 0;
  var searches = 0;
  var activeRun = null;
  // Most recently completed run; survives only in this page's memory while the
  // player is on results/Tribune screens, then disappears on reload/tab close.
  var resultRun = null;

  // Core Web Vitals / navigation timing. No URL or user identity is attached.
  var perf = { ttfb: null, lcp: null, cls: 0, inp: null, dcl: null, load: null };

  var landing = landingContext();

  function uid(prefix) {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  function viewportBucket() {
    var w = window.innerWidth || 0;
    return w < 600 ? "sm" : (w < 1024 ? "md" : "lg");
  }

  function connectionBucket() {
    try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return "";
      if (c.saveData) return "save-data";
      return safeToken(c.effectiveType || "", 16);
    } catch (e) { return ""; }
  }

  function localHour() {
    try { return new Date().getHours(); } catch (e) { return null; }
  }

  function pageKey() {
    var p = String(location.pathname || "/");
    if (p === "/" || p === "/index.html") return "game";
    if (/^\/[A-Z0-9][A-Za-z0-9_-]{4}$/.test(p)) return "tribune_share";
    if (/^\/r\/[A-Z0-9][A-Za-z0-9_-]{4}\/?$/.test(p)) return "tribune_share";
    var known = {
      "/404.html": "404",
      "/faq": "faq", "/faq/": "faq",
      "/how-it-works": "how_it_works", "/how-it-works/": "how_it_works",
      "/can-you-go-82-0": "can_you_go_82_0", "/can-you-go-82-0/": "can_you_go_82_0",
      "/what-is-bpm": "what_is_bpm", "/what-is-bpm/": "what_is_bpm"
    };
    // Unknown URLs are served by 404.html. Bucket them rather than storing an
    // arbitrary requested path, which could contain a token or other private text.
    return known[p] || "404_or_other";
  }

  function safeToken(v, max) {
    if (v === null || v === undefined) return "";
    return String(v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 80);
  }

  function safeReferrer(v) {
    if (!v) return "";
    try {
      var u = new URL(v, location.href);
      return (u.protocol === "http:" || u.protocol === "https:") ? u.origin.slice(0, 160) : "";
    } catch (e) { return ""; }
  }

  function safeHost(v) {
    if (!v) return "";
    try { return new URL(v, location.href).hostname.toLowerCase().slice(0, 100); }
    catch (e) { return ""; }
  }

  function safePath(v) {
    if (!v) return "";
    try {
      var p = new URL(v, location.href).pathname || "/";
      if (/^\/[A-Z0-9][A-Za-z0-9_-]{4}$/.test(p)) return "/edition";
      if (/^\/r\//.test(p)) return "/r/edition";
      return p.slice(0, 100);
    } catch (e) { return ""; }
  }

  function copy(o) {
    var out = {}, k;
    if (!o) return out;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
    return out;
  }

  function addContext(p) {
    var c = null;
    try { c = typeof window.t82AnalyticsContext === "function" ? window.t82AnalyticsContext() : null; }
    catch (e) { c = null; }
    if (c) {
      Object.keys(c).forEach(function (k) {
        if (p[k] === undefined || p[k] === null || p[k] === "") p[k] = c[k];
      });
    }
    p.build = p.build || ANALYTICS_BUILD;
    p.page = p.page || landing.page;
    p.entry = p.entry || landing.entry;
    p.campaign_source = p.campaign_source || landing.campaign_source;
    p.campaign_medium = p.campaign_medium || landing.campaign_medium;
    p.campaign_name = p.campaign_name || landing.campaign_name;
    p.campaign_content = p.campaign_content || landing.campaign_content;
    p.nav_type = p.nav_type || landing.nav_type;
    p.language = p.language || safeToken((navigator.languages && navigator.languages[0]) || navigator.language || "", 16);
    p.local_hour = p.local_hour == null ? localHour() : p.local_hour;
    p.connection = p.connection || connectionBucket();
    if (p.elapsed_ms === undefined || p.elapsed_ms === null) p.elapsed_ms = Math.max(0, Date.now() - startTs);
    return p;
  }

  function mergeIntoRun(run, p) {
    if (!run || !p) return;
    ["mode", "round", "franchise", "decade", "player_spend", "reroll_spend",
     "budget_used", "roster_value", "variant", "challenge", "daily_num",
     "official", "practice", "target_wins", "target_net", "wins", "net",
     "undefeated", "result_delta"].forEach(function (k) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== "") run[k] = p[k];
    });
  }
  function mergeRun(p) { mergeIntoRun(activeRun, p); }
  function applyRunContext(p, run) {
    if (!p || !run) return;
    ["mode", "round", "franchise", "decade", "player_spend", "reroll_spend",
     "budget_used", "roster_value", "variant", "challenge", "daily_num",
     "official", "practice", "target_wins", "target_net", "wins", "net",
     "undefeated", "result_delta"].forEach(function (k) {
      if ((p[k] === undefined || p[k] === null || p[k] === "") && run[k] !== undefined) p[k] = run[k];
    });
  }

  function post(payload, beacon) {
    payload.sid = sid;
    payload.t = Date.now(); // client timestamp; Worker stamps authoritative ts
    try {
      if (beacon && navigator.sendBeacon) {
        var sent = navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        if (sent) return;
      }
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "same-origin"
      }).then(function (res) {
        lastSchema = res.headers.get("x-t82-event-schema") || lastSchema;
        lastIngestError = res.headers.get("x-t82-err") || "";
      }).catch(function (err) {
        lastIngestError = safeToken(err && (err.name || err.message || err), 120);
      });
    } catch (e) {}
  }

  function postgameEvent(name) {
    return /^(results_view|result_section_view|share|share_|recap_|percentile_|replay|feedback_click|heatcheck_|link_out)/.test(name);
  }

  function track(name, props) {
    var p = addContext(props ? copy(props) : {});

    // Local-only state refresh. This never writes a D1 row.
    if (name === "run_state") {
      mergeRun(p);
      return;
    }

    p.name = name;

    if (name === "home_view") resultRun = null;

    if (name === "game_start") {
      gamesPlayed += 1;
      resultRun = null;
      p.run_id = uid("r");
      activeRun = {
        run_id: p.run_id,
        mode: p.mode || "?",
        picks: 0,
        rerolls: 0,
        searches: 0,
        started_at: Date.now()
      };
      mergeRun(p);
      post(p, false);
      return;
    }

    var eventRun = activeRun || (postgameEvent(name) ? resultRun : null);
    if (eventRun) {
      p.run_id = eventRun.run_id;
      applyRunContext(p, eventRun);
      mergeIntoRun(eventRun, p);
    }

    if (name === "round_advance" && p.round > maxRound) maxRound = p.round;
    if (name === "draft_pick" && activeRun) activeRun.picks += 1;
    if (name === "reroll" && activeRun) activeRun.rerolls += 1;
    if (name === "search_use") { searches += 1; if (activeRun) activeRun.searches += 1; }
    if (name === "share_click") shareIntents += 1;
    if (name === "share_result" && p.outcome === "success") completedShares += 1;

    // The terminal run event receives the summary accumulated by the client.
    if ((name === "game_complete" || name === "run_abandon") && activeRun) {
      if (p.ordinal == null) p.ordinal = activeRun.picks;
      if (p.value == null) p.value = activeRun.rerolls;
      if (p.amount == null) p.amount = activeRun.searches;
      if (p.duration == null) p.duration = Math.max(0, Date.now() - activeRun.started_at);
    }

    post(p, false);

    if (name === "game_complete" && activeRun) {
      resultRun = copy(activeRun);
      resultRun.completed_at = Date.now();
      mergeIntoRun(resultRun, p);
      activeRun = null;
    } else if (name === "run_abandon") {
      activeRun = null;
      resultRun = null;
    }
  }

  function currentVisibleMs() {
    return visibleMs + (visibleSince ? Math.max(0, Date.now() - visibleSince) : 0);
  }

  // Engagement is foreground time capped after 30 seconds without input. This
  // keeps a phone left open on the results page from looking like active play,
  // while still crediting ordinary reading between taps and scrolls.
  function settleEngaged(now) {
    if (!lastEngagedTick) return;
    var cutoff = Math.min(now, (lastActivityAt || lastEngagedTick) + ENGAGED_IDLE_MS);
    if (cutoff > lastEngagedTick) engagedMs += cutoff - lastEngagedTick;
    lastEngagedTick = now;
  }

  function markActivity() {
    if (document.visibilityState === "hidden") return;
    var now = Date.now();
    settleEngaged(now);
    lastActivityAt = now;
    lastEngagedTick = now;
  }

  function currentEngagedMs() {
    var now = Date.now();
    var extra = 0;
    if (lastEngagedTick && document.visibilityState !== "hidden") {
      extra = Math.max(0, Math.min(now, (lastActivityAt || lastEngagedTick) + ENGAGED_IDLE_MS) - lastEngagedTick);
    }
    return engagedMs + extra;
  }

  function abandonActiveRun() {
    if (!activeRun) return;
    var p = copy(activeRun);
    p.name = "run_abandon";
    p.reason = "page_exit";
    p.duration = Math.max(0, Date.now() - activeRun.started_at);
    p.ordinal = activeRun.picks;
    p.value = activeRun.rerolls;
    p.amount = activeRun.searches;
    post(addContext(p), true);
    activeRun = null;
  }

  function sendPerf(beacon) {
    if (perfSent) return;
    perfSent = true;
    post(addContext({
      name: "perf_summary",
      ttfb_ms: perf.ttfb,
      lcp_ms: perf.lcp,
      cls: Math.round(perf.cls * 10000) / 10000,
      inp_ms: perf.inp,
      load_ms: perf.load,
      duration: perf.dcl
    }), !!beacon);
  }

  function sessionSummary(name) {
    return addContext({
      name: name,
      duration: Math.max(0, Date.now() - startTs),
      engaged_ms: currentEngagedMs(),
      visible_ms: currentVisibleMs(),
      games_played: gamesPlayed,
      max_round: maxRound,
      interaction_count: uiClicks,
      search_count: searches,
      share_intents: shareIntents,
      share_completions: completedShares,
      scroll_pct: maxScrollPct,
      value: externalClicks
    });
  }

  function heartbeat() {
    if (document.visibilityState === "hidden") return;
    var now = Date.now();
    // Do not write rows for a completely idle tab. A heartbeat appears after
    // some new interaction or after another full minute of active play/read.
    if (uiClicks === lastHeartbeatClicks && now - lastHeartbeatAt < 120000) return;
    lastHeartbeatAt = now;
    lastHeartbeatClicks = uiClicks;
    post(sessionSummary("session_heartbeat"), false);
  }

  function end(realExit) {
    var now = Date.now();
    settleEngaged(now);
    lastEngagedTick = 0;
    if (visibleSince) {
      visibleMs += Math.max(0, now - visibleSince);
      visibleSince = 0;
    }
    if (realExit) abandonActiveRun();
    sendPerf(realExit);
    if (ended) return;
    ended = true;
    post(sessionSummary("session_end"), true);
  }

  function reopen() {
    ended = false;
    if (!visibleSince && document.visibilityState !== "hidden") {
      var now = Date.now();
      visibleSince = now;
      lastActivityAt = now;
      lastEngagedTick = now;
    }
  }

  function landingContext() {
    var sp;
    try { sp = new URLSearchParams(location.search || ""); } catch (e) { sp = null; }
    var ref = safeReferrer(document.referrer || "");
    var self = false;
    try { self = !!ref && new URL(ref).origin === location.origin; } catch (e) {}
    var internalSource = sp ? safeToken(sp.get("src"), 80) : "";
    var entry = "direct";
    if (sp && sp.get("d")) entry = "daily_link";
    else if (sp && sp.get("ref")) entry = "tribune_referral";
    else if (sp && (sp.get("utm_source") || sp.get("utm_campaign"))) entry = "campaign";
    else if (internalSource) entry = "internal";
    else if (self) entry = "self";
    else if (ref) entry = "referral";

    var navType = "navigate";
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (nav && nav.type) navType = nav.type;
      else if (performance.navigation) navType = ["navigate", "reload", "back_forward", "prerender"][performance.navigation.type] || "navigate";
    } catch (e) {}

    var out = {
      page: pageKey(),
      entry: entry,
      referrer: ref,
      campaign_source: sp ? safeToken(sp.get("utm_source"), 80) : "",
      campaign_medium: sp ? safeToken(sp.get("utm_medium"), 80) : "",
      campaign_name: sp ? safeToken(sp.get("utm_campaign"), 80) : "",
      campaign_content: sp ? safeToken(sp.get("utm_content"), 80) : "",
      nav_type: safeToken(navType, 24)
    };

    // Internal explainer/404 CTAs use ?src=... rather than UTM parameters.
    // Treat them like a first-party campaign without exposing a prior URL path.
    if (internalSource && !out.campaign_source) {
      out.campaign_source = "true82";
      out.campaign_medium = "internal";
      out.campaign_name = "site_nav";
      out.campaign_content = internalSource;
    }
    return out;
  }

  function surfaceFor(node) {
    if (!node || !node.closest) return "page";
    if (node.closest(".gate")) return "daily_gate";
    if (node.closest(".intro")) return "home";
    if (node.closest(".rules-overlay")) return "rules";
    if (node.closest(".np-overlay")) return "newspaper";
    if (node.closest(".hh-overlay")) return "heat_check";
    if (node.closest(".draft-utility,.mode-panel,.ticket,.pool,.tray")) return "draft";
    if (node.closest(".board,.results-topbar,.actions")) return "results";
    if (node.closest("footer,.site-foot")) return "footer";
    if (node.closest("header,.site-head")) return "header";
    return "page";
  }

  function actionFor(node) {
    if (!node) return "control";
    var id = safeToken(node.id, 64);
    if (id) return id;
    var d = safeToken(node.getAttribute && (node.getAttribute("data-action") || node.getAttribute("data-sort")), 64);
    if (d) return d;
    var cls = safeToken(node.className, 100).split(" ").filter(function (x) {
      return /(?:btn|button|chip|link|act|skip|share|replay|again|close|back|info)/i.test(x);
    })[0];
    if (cls) return cls;
    return safeToken(node.tagName, 24).toLowerCase() || "control";
  }

  function captureFirstInteraction(ev) {
    markActivity();
    if (firstInteractionSent) return;
    if (ev.type === "keydown" && ev.key && /^(Shift|Alt|Control|Meta|CapsLock|Tab)$/.test(ev.key)) return;
    firstInteractionSent = true;
    track("first_interaction", {
      surface: surfaceFor(ev.target),
      action: ev.type === "keydown" ? "keyboard" : ev.type,
      elapsed_ms: Math.max(0, Date.now() - startTs)
    });
  }

  function captureControl(ev) {
    markActivity();
    var target = ev.target && ev.target.closest ? ev.target.closest("button,a,[role='button']") : null;
    if (!target) return;
    // Player cards have dedicated, richer events. Never record their text here.
    if (target.classList && target.classList.contains("player-row")) return;
    var surface = surfaceFor(target);
    var action = actionFor(target);
    uiClicks += 1;
    track("ui_click", { surface: surface, action: action });

    if (target.tagName && target.tagName.toLowerCase() === "a") {
      var href = target.getAttribute("href") || "";
      var host = safeHost(href);
      if (host && host !== String(location.hostname || "").toLowerCase()) {
        externalClicks += 1;
        var camp = "";
        try { camp = safeToken(new URL(href, location.href).searchParams.get("utm_campaign"), 80); } catch (e) {}
        track("link_out", {
          surface: surface,
          action: camp || action,
          host: host,
          detail: safePath(href),
          source: safeToken(target.getAttribute("data-bb"), 80)
        });
      }
    }
  }

  function updateScroll() {
    markActivity();
    try {
      var doc = document.documentElement;
      var body = document.body;
      var full = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0, window.innerHeight || 0);
      var bottom = (window.scrollY || window.pageYOffset || 0) + (window.innerHeight || 0);
      var p = full > 0 ? Math.max(0, Math.min(100, Math.round(100 * bottom / full))) : 0;
      if (p > maxScrollPct) maxScrollPct = p;
    } catch (e) {}
  }

  function scrubError(v) {
    var s = safeToken(v && (v.message || v.reason || v), 220);
    s = s.replace(/https?:\/\/[^\s)]+/g, function (u) {
      try { return new URL(u).origin; } catch (e) { return "url"; }
    });
    s = s.replace(/[A-Za-z0-9_-]{24,}/g, "token");
    return s;
  }

  function recordError(kind, detail, source, line, status) {
    if (errorCount >= maxErrors) return;
    errorCount += 1;
    track("client_error", {
      action: kind,
      error_code: safeToken(detail && detail.name, 64) || kind,
      detail: scrubError(detail),
      source: safePath(source || ""),
      ordinal: line || null,
      http_status: status || null
    });
  }

  function initPerformance() {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (nav) {
        perf.ttfb = Math.max(0, Math.round(nav.responseStart - nav.requestStart));
        perf.dcl = Math.max(0, Math.round(nav.domContentLoadedEventEnd - nav.startTime));
        if (nav.loadEventEnd) perf.load = Math.max(0, Math.round(nav.loadEventEnd - nav.startTime));
      }
    } catch (e) {}

    if (typeof PerformanceObserver !== "function") return;
    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        if (entries.length) perf.lcp = Math.round(entries[entries.length - 1].startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch (e) {}
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (x) { if (!x.hadRecentInput) perf.cls += x.value || 0; });
      }).observe({ type: "layout-shift", buffered: true });
    } catch (e) {}
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (x) {
          if (x.interactionId && (perf.inp === null || x.duration > perf.inp)) perf.inp = Math.round(x.duration);
        });
      }).observe({ type: "event", buffered: true, durationThreshold: 40 });
    } catch (e) {}
    window.addEventListener("load", function () {
      setTimeout(function () {
        try {
          var n = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
          if (n && n.loadEventEnd) perf.load = Math.max(0, Math.round(n.loadEventEnd - n.startTime));
        } catch (e) {}
      }, 0);
    }, { once: true });
  }

  window.t82track = track;
  window.t82AnalyticsDebug = function () {
    return {
      build: ANALYTICS_BUILD,
      sid: sid,
      landing: copy(landing),
      gamesPlayed: gamesPlayed,
      maxRound: maxRound,
      visibleMs: currentVisibleMs(),
      engagedMs: currentEngagedMs(),
      activeRun: activeRun ? copy(activeRun) : null,
      resultRun: resultRun ? copy(resultRun) : null,
      perf: copy(perf),
      eventSchema: lastSchema,
      ingestError: lastIngestError
    };
  };

  // Start as early as possible; app.js attaches richer context once it loads.
  track("session_start", {
    referrer: landing.referrer,
    viewport: viewportBucket(),
    surface: "page",
    action: "open"
  });

  document.addEventListener("pointerdown", captureFirstInteraction, true);
  document.addEventListener("keydown", captureFirstInteraction, true);
  document.addEventListener("click", captureControl, true);
  document.addEventListener("pointerdown", updateScroll, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("error", function (ev) {
    if (ev && ev.target && ev.target !== window) {
      var tag = ev.target.tagName ? String(ev.target.tagName).toLowerCase() : "resource";
      recordError("resource_error", { name: tag, message: "resource failed" }, ev.target.src || ev.target.href || "", null, null);
      return;
    }
    recordError("window_error", ev && (ev.error || ev.message), ev && ev.filename, ev && ev.lineno, null);
  }, true);
  window.addEventListener("unhandledrejection", function (ev) {
    recordError("unhandled_rejection", ev && ev.reason, "", null, null);
  });

  window.addEventListener("pagehide", function (ev) { end(!(ev && ev.persisted)); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") end(false);
    else reopen();
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) reopen(); });

  initPerformance();
  updateScroll();
  heartbeatTimer = setInterval(heartbeat, 60000);
})();

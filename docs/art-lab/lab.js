/* ---------- THE ART LAB (docs/art-lab/): the owner's page for tonight's art (v67) ----------
   Gray asked for "a ton" of looks for the reel's L, its dots, the season print, and then for the Heat Check, the
   Presti perks and 82-0 (art/CONCEPTS.md, art/CONTRACT-FX.md). He picks the keepers here, on his phone: every look
   plays on the game's real engines at phone size, a heart loves it, an X cuts it, and YOUR PICKS turns the marks into
   a plain-text code he pastes to Claude. The lab never touches the game's shuffle bags (no deal, no used): it only
   lists, loads and plays.

   The engines come from the repo root with the keys the game itself links (read from ../../index.html, which always
   revalidates), so the lab never pins a stale engine on a phone that cached last week's copy for a year. Every look
   loads only when its tab opens; banners and ledgers print one at a time in idle moments; one reel, one print reveal
   and one FX pack run at a time, and leaving a tab stops them. ES5, like the engines. */
(function () {
  "use strict";
  var doc = document, win = window;
  var ROOT = "../../";
  var LAB_V = "v1";
  var K_PICKS = "t82-art-lab-picks-v1", K_UI = "t82-art-lab-ui-v1", K_NOTES = "t82-art-lab-notes-v1";
  var KINDS = ["loss", "dots", "scene", "hot", "perk", "goat"];
  var BUILTIN = { loss: "classic", dots: "classic", scene: "lake", hot: "classic", perk: "classic", goat: "classic" };
  var BUILTIN_NAME = { loss: "Classic L", dots: "Classic", scene: "Lake", hot: "Classic", perk: "Classic", goat: "Classic" };
  var LIVE_HOST = /^(www\.)?true82\.net$/i;
  // the keys the game linked when this lab was written: used only when the game's index.html cannot be read
  var KEYS0 = { "styles.css": "20260929-v66", "look.css": "20260927-v60", "art-core.js": "20260930-v67", "art-index.js": "20260930-v67",
    "reel-riso.js": "20260930-v67", "results-riso.js": "20260930-v67", "riso-fx.js": "20260930-v67" };
  var ENGINES = ["art-core.js", "art-index.js", "reel-riso.js", "results-riso.js", "riso-fx.js"];

  var TABS = [
    { key: "loss", label: "The L", kinds: ["loss"],
      intro: "The big L on a heavy loss. Ten in a row should never feel the same twice." },
    { key: "dots", label: "The Dots", kinds: ["dots"],
      intro: "The ledger's win and loss stamps. Each set prints a whole season; tap WATCH A MONTH to see it stamp in." },
    { key: "picture", label: "The Picture", kinds: ["scene"],
      intro: "The print at the end of a season. Pick a record and a light, then tap a print to watch it reveal." },
    { key: "perfect", label: "82\u20130", kinds: ["scene", "goat"],
      intro: "Only a perfect season gets these. It has to feel so much better than 81-1." },
    { key: "hot", label: "Hot Hand", kinds: ["hot"],
      intro: "The Heat Check, beat by beat. A pack restyles all seven beats in one look, and every beat goes bigger than the last." },
    { key: "perk", label: "Perks", kinds: ["perk"],
      intro: "Presti's lucky spins: REFUND and FIRE SALE, over the three cost buttons." }
  ];

  /* ---------------- small helpers ---------------- */
  function $(id) { return doc.getElementById(id); }
  function h(tag, cls, attrs, kids) {
    var e = doc.createElement(tag), k;
    if (cls) e.className = cls;
    if (attrs) for (k in attrs) {
      if (!attrs.hasOwnProperty(k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === "onclick") e.addEventListener("click", attrs[k]);
      else if (k === "html") e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k] === true ? "" : String(attrs[k]));
    }
    add(e, kids);
    return e;
  }
  function add(e, kids) {
    if (kids == null) return e;
    if (!(kids instanceof Array)) kids = [kids];
    kids.forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === "string" ? doc.createTextNode(c) : c); });
    return e;
  }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function ones(n) { var a = []; for (var i = 0; i < n; i++) a.push(1); return a; }
  function dpr() { return Math.max(1, Math.min(2, win.devicePixelRatio || 1)); }
  function idle(fn) { if (typeof win.requestIdleCallback === "function") win.requestIdleCallback(fn, { timeout: 300 }); else setTimeout(fn, 24); }
  function now() { return win.performance && performance.now ? performance.now() : Date.now(); }
  function readJSON(k) { try { var v = win.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeJSON(k, v) { try { win.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  function art() { return win.T82ART && win.T82ART.add ? win.T82ART : null; }
  function defOf(kind, id) { var A = art(); try { return A && A.get ? A.get(kind, id) : null; } catch (e) { return null; } }
  // seeded, so a record prints the same season every time (the QA bench's mulberry32)
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seasonOf(w, seed) {               // 82 games with exactly w wins, shuffled by seed
    var g = [], i, r = mulberry(seed >>> 0);
    for (i = 0; i < 82; i++) g.push(i < w ? 1 : 0);
    for (i = 81; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = g[i]; g[i] = g[j]; g[j] = t; }
    return g;
  }

  // the two marks, drawn (a heart glyph prints as a red emoji on some iPhones)
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="lab-fill" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" d="M12 20.4s-7.1-4.4-9.1-8.8C1.5 8.4 3.5 5.1 6.8 5.1c2 0 3.5 1.1 5.2 3.1 1.7-2 3.2-3.1 5.2-3.1 3.3 0 5.3 3.3 3.9 6.5-2 4.4-9.1 8.8-9.1 8.8z"/></svg>';
  // the asterisk: "yes, but this needs to change" (the owner, 2026-10-01): a note he types under the look
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  var PLAY = '<svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true"><path fill="currentColor" d="M1.5 1l7.5 4-7.5 4z"/></svg>';
  var PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg>';
  var NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>';

  /* ---------------- the toast ---------------- */
  var toastT = 0;
  function toast(msg) {
    var t = $("labToast");
    if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("on"); }, 2200);
  }

  /* ---------------- picks: love, cut, or unmarked (a keep); kept on this phone ---------------- */
  var PICKS = (function () { var p = readJSON(K_PICKS); return p && typeof p === "object" && !(p instanceof Array) ? p : {}; })();
  var UI = (function () { var u = readJSON(K_UI); return u && typeof u === "object" ? u : {}; })();
  function saveUI() { writeJSON(K_UI, UI); }
  // the notes: "yes, but" comments, one per look, kept on this phone beside the hearts and Xs (independent of them:
  // a loved look can still carry a note)
  var NOTES = (function () { var n = readJSON(K_NOTES); return n && typeof n === "object" && !(n instanceof Array) ? n : {}; })();
  function noteOf(key) { return typeof NOTES[key] === "string" ? NOTES[key] : ""; }
  function setNote(key, text) {
    text = String(text || "").replace(/\s+$/, "");
    if (text.replace(/\s/g, "")) NOTES[key] = text; else delete NOTES[key];
    if (!writeJSON(K_NOTES, NOTES) && !setMark.warned) { setMark.warned = true; toast("This browser won't save picks: copy the code before you leave."); }
    paintNotes(key);
    paintBar();
  }
  function paintNotes(key) {
    var has = !!noteOf(key);
    Array.prototype.forEach.call(doc.querySelectorAll('[data-nk="' + key + '"]'), function (b) { b.setAttribute("aria-pressed", has ? "true" : "false"); });
    Array.prototype.forEach.call(doc.querySelectorAll('.lab-tile[data-key="' + key + '"]'), function (t) { t.classList.toggle("is-noted", has); });
  }
  // The note's box drops down under the look (a tile) or under the card's buttons (what is playing). It stays bound
  // to the look it was opened for, so the next look in a ten-in-a-row never steals what he is typing.
  function noteBox(key, name) {
    var ta = h("textarea", "lab-notetext", { rows: 3, maxlength: 600, "data-nt": key, "aria-label": "Yes, but: what should change in " + (name || key),
      placeholder: "Yes, but\u2026 what should change? (slower, less aqua, a bigger L)" });
    ta.value = noteOf(key);
    var t = 0;
    ta.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { setNote(key, ta.value); }, 250); });
    ta.addEventListener("blur", function () { clearTimeout(t); setNote(key, ta.value); });
    var done = h("button", "lab-note-done", { type: "button" }, "DONE");
    var box = h("div", "lab-notebox", { "data-nb": key }, [
      h("div", "lab-note-head", null, [h("span", "lab-note-label", null, "* YES, BUT" + (name ? " \u00B7 " + String(name).toUpperCase() : "")), done]), ta]);
    done.addEventListener("click", function () { clearTimeout(t); setNote(key, ta.value); box.parentNode && box.parentNode.removeChild(box); syncOpen(); });
    return box;
  }
  function syncOpen() {
    Array.prototype.forEach.call(doc.querySelectorAll("[data-nk]"), function (b) {
      var holder = b.closest(".lab-tile") || b.closest(".lab-now"), box = holder && holder.querySelector(".lab-notebox");
      b.setAttribute("aria-expanded", box && box.getAttribute("data-nb") === b.getAttribute("data-nk") ? "true" : "false");
    });
  }
  doc.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("[data-nk]") : null;
    if (!b || b.disabled) return;
    var key = b.getAttribute("data-nk");
    if (!key) return;
    var holder = b.closest(".lab-tile") || b.closest(".lab-now");
    if (!holder) return;
    var open = holder.querySelector(".lab-notebox");
    if (open) {                                                   // save whatever is in it, then close (or swap looks)
      var ta0 = open.querySelector("textarea");
      if (ta0) setNote(open.getAttribute("data-nb"), ta0.value);
      open.parentNode.removeChild(open);
      if (open.getAttribute("data-nb") === key) { syncOpen(); return; }
    }
    var box = noteBox(key, b.getAttribute("data-nn") || "");
    holder.appendChild(box);
    syncOpen();
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    var ta = box.querySelector("textarea");
    try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
    if (box.scrollIntoView) try { box.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { box.scrollIntoView(false); }
  });
  function markOf(key) { return PICKS[key] === "love" || PICKS[key] === "cut" ? PICKS[key] : ""; }
  function setMark(key, m) {
    if (m) PICKS[key] = m; else delete PICKS[key];
    if (!writeJSON(K_PICKS, PICKS) && !setMark.warned) { setMark.warned = true; toast("This browser won't save picks: copy the code before you leave."); }
    paintMarks(key);
    paintBar();
    if (BUILT.loss && BUILT.loss.refresh) BUILT.loss.refresh();
  }
  function paintMarks(key) {
    var m = markOf(key);
    Array.prototype.forEach.call(doc.querySelectorAll('[data-mk="' + key + '"]'), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-m") === m ? "true" : "false");
    });
    Array.prototype.forEach.call(doc.querySelectorAll('.lab-tile[data-key="' + key + '"]'), function (t) {
      t.classList.toggle("is-love", m === "love");
      t.classList.toggle("is-cut", m === "cut");
    });
  }
  function marks(key, big, name) {
    var box = h("div", "lab-marks");
    box.appendChild(h("button", "lab-mk is-love", { type: "button", "data-mk": key, "data-m": "love", "aria-pressed": markOf(key) === "love" ? "true" : "false",
      "aria-label": "Love it", html: HEART + (big ? "<span>LOVE</span>" : "") }));
    box.appendChild(h("button", "lab-mk is-cut", { type: "button", "data-mk": key, "data-m": "cut", "aria-pressed": markOf(key) === "cut" ? "true" : "false",
      "aria-label": "Cut it", html: CROSS + (big ? "<span>CUT</span>" : "") }));
    box.appendChild(h("button", "lab-mk is-note", { type: "button", "data-nk": key, "data-nn": name || "", "aria-pressed": noteOf(key) ? "true" : "false",
      "aria-expanded": "false", "aria-label": "Yes, but: write what should change", html: STAR }));
    return box;
  }
  // one listener for every heart and X on the page
  doc.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("[data-mk]") : null;
    if (!b || b.disabled) return;
    var key = b.getAttribute("data-mk"), m = b.getAttribute("data-m");
    if (!key) return;
    setMark(key, markOf(key) === m ? "" : m);
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  });
  function counts() {
    var love = 0, cut = 0;
    Object.keys(PICKS).forEach(function (k) { if (PICKS[k] === "love") love++; else if (PICKS[k] === "cut") cut++; });
    return { love: love, cut: cut, note: Object.keys(NOTES).length };
  }
  function paintBar() {
    var c = counts(), el = $("labBarCount");
    if (!el) return;
    el.innerHTML = "";
    if (!c.love && !c.cut && !c.note) { el.textContent = "Nothing marked yet"; return; }
    el.appendChild(h("span", "lab-n-love", null, c.love + (c.love === 1 ? " love" : " loves")));
    el.appendChild(h("span", "lab-n-cut", null, c.cut + (c.cut === 1 ? " cut" : " cuts")));
    if (c.note) el.appendChild(h("span", "lab-n-note", null, c.note + (c.note === 1 ? " note" : " notes")));
  }
  // The code he pastes back: plain text, one line per kind. Ids are the files' names (art/<kind>/<id>.js).
  function picksCode() {
    var lines = ["ART-LAB PICKS " + LAB_V + "  " + today()];
    KINDS.forEach(function (kind) {
      var love = [], cut = [];
      Object.keys(PICKS).sort().forEach(function (k) {
        var i = k.indexOf("/");
        if (i < 0 || k.slice(0, i) !== kind) return;
        if (PICKS[k] === "love") love.push(k.slice(i + 1)); else if (PICKS[k] === "cut") cut.push(k.slice(i + 1));
      });
      lines.push(kind + ": love " + (love.join(" ") || "-") + " | cut " + (cut.join(" ") || "-"));
    });
    var nk = Object.keys(NOTES).filter(function (k) { return noteOf(k); }).sort();
    if (nk.length) {
      lines.push("yes, but (keep, with these changes):");
      nk.forEach(function (k) { lines.push("* " + k + ": " + noteOf(k).replace(/\s+/g, " ").replace(/^\s|\s$/g, "")); });
    }
    lines.push("unmarked = keep. In the lab: " + KINDS.map(function (k) { return k + " " + (LIST[k] ? LIST[k].length : 0); }).join(", ") + ".");
    return lines.join("\n");
  }
  function openSheet() {
    $("labCode").textContent = picksCode();
    $("labBackdrop").classList.add("on");
    $("labSheet").classList.add("on");
  }
  function closeSheet() { $("labBackdrop").classList.remove("on"); $("labSheet").classList.remove("on"); }
  function selectCode() {
    try { var r = doc.createRange(); r.selectNodeContents($("labCode")); var s = win.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* the code is still on screen */ }
  }
  function copyCode() {
    var t = picksCode();
    $("labCode").textContent = t;
    function fallback() {
      selectCode();
      var ok = false;
      try { ok = doc.execCommand && doc.execCommand("copy"); } catch (e) { ok = false; }
      toast(ok ? "Copied. Paste it to Claude." : "It's selected: tap Copy, then paste it to Claude.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast("Copied. Paste it to Claude."); }, fallback);
    else fallback();
  }

  /* ---------------- the engines: the keys the game links today ---------------- */
  function gameKeys() {
    if (typeof fetch !== "function") return Promise.resolve({});
    return fetch(ROOT + "index.html", { cache: "no-cache" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
      var keys = {}, re = /(?:src|href)=["']\/?([a-z0-9-]+\.(?:js|css))\?v=([A-Za-z0-9._-]+)["']/g, m;
      while ((m = re.exec(html))) keys[m[1]] = m[2];
      return keys;
    }).catch(function () { return {}; });
  }
  function addScript(src) {
    return new Promise(function (res) {
      var s = doc.createElement("script");
      s.src = src; s.async = false;                      // dynamic, but in order: art-core before its index, the reel before the FX layer
      s.onload = function () { res(true); }; s.onerror = function () { res(false); };
      doc.head.appendChild(s);
    });
  }
  function loadEngines(keys) {
    var known = Object.keys(keys).length > 0;
    Array.prototype.forEach.call(doc.querySelectorAll("link[data-lab-key]"), function (lk) {
      var f = lk.getAttribute("data-lab-key");
      if (keys[f] && (lk.getAttribute("href") || "").indexOf("v=" + keys[f]) < 0) lk.setAttribute("href", ROOT + f + "?v=" + keys[f]);
    });
    // riso-fx.js loads only when the game links it: before that, the FX tabs say it has not landed
    var list = ENGINES.filter(function (f) { return known ? !!keys[f] : f !== "riso-fx.js"; });
    return Promise.all(list.map(function (f) { return addScript(ROOT + f + "?v=" + (keys[f] || KEYS0[f])); }));
  }
  // art/ledger.json: the reviewers' tier (A or B) and one line per look, in whichever shape it was written
  var LEDGER = {};
  function loadLedger() {
    if (typeof fetch !== "function") return Promise.resolve();
    return fetch(ROOT + "art/ledger.json?lab=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { LEDGER = normLedger(j); }).catch(function () { LEDGER = {}; });
  }
  function normLedger(j) {
    var out = {};
    function put(kind, id, v) {
      if (!kind || !id || v == null) return;
      var o = typeof v === "string" ? { tier: v } : v, t = String(o.tier || o.t || o.grade || "").toUpperCase().charAt(0);
      out[kind + "/" + id] = { tier: t === "A" || t === "B" ? t : "", note: String(o.note || o.line || o.n || o.why || "") };
    }
    if (!j || typeof j !== "object") return out;
    var list = j instanceof Array ? j : j.variants instanceof Array ? j.variants : j.entries instanceof Array ? j.entries : j.looks instanceof Array ? j.looks : null;
    if (list) {
      list.forEach(function (v) {
        if (!v || typeof v !== "object") return;
        var kind = v.kind, id = v.id, key = v.key || v.ref;
        if ((!kind || !id) && typeof key === "string") { var p = key.split(/[\/:]/); kind = p[0]; id = p[1]; }
        put(kind, id, v);
      });
      return out;
    }
    var src = j.ledger && typeof j.ledger === "object" ? j.ledger : j;
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (/^[a-z]+[\/:][a-z0-9-]+$/.test(k)) { var p = k.split(/[\/:]/); put(p[0], p[1], v); }
      else if (KINDS.indexOf(k) >= 0 && v && typeof v === "object") {
        if (v instanceof Array) v.forEach(function (x) { if (x && x.id) put(k, x.id, x); });
        else Object.keys(v).forEach(function (id) { put(k, id, v[id]); });
      }
    });
    return out;
  }

  /* ---------------- the looks of each kind ---------------- */
  var LIST = {};                                         // kind -> [look], the built-in first, then tier A, B, the rest
  function lookOf(kind, id, o) {
    var key = kind + "/" + id, led = LEDGER[key] || {};
    return { kind: kind, id: id, key: key, name: o.name || id, file: o.file || null, on: o.on !== false, builtin: !!o.builtin,
      tier: led.tier || "", note: led.note || "", by: "", perfect: !!o.perfect, state: "" };
  }
  function syncDef(v) {
    var d = defOf(v.kind, v.id);
    if (!d) return false;
    if (typeof d.by === "string") v.by = d.by;
    if (v.builtin && typeof d.name === "string") v.name = d.name;
    v.perfect = d.perfect === true;
    return true;
  }
  function buildList(kind) {
    var A = art(), out = [], seen = {}, b = BUILTIN[kind], i = 0;
    if (b) { out.push(lookOf(kind, b, { name: BUILTIN_NAME[kind], builtin: true })); seen[b] = 1; }
    if (A && A.catalog) {
      try {
        A.catalog(kind).forEach(function (en) {
          if (!en || seen[en.id]) return;
          seen[en.id] = 1;
          out.push(lookOf(kind, en.id, { name: en.name, file: en.file, on: en.on, perfect: en.perfect === true }));
        });
      } catch (e) { /* an older art-core without this kind: just the built-in */ }
    }
    out.forEach(function (v) { v.n = i++; syncDef(v); });
    var rank = function (v) { return v.builtin ? 0 : v.tier === "A" ? 1 : v.tier === "B" ? 2 : 3; };
    out.sort(function (a, b2) { return rank(a) - rank(b2) || a.n - b2.n; });
    LIST[kind] = out;
    return out;
  }
  function look(kind, id) { var l = LIST[kind] || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  // Loads the files of these looks (the built-ins are inside the engines). Resolves with the ids that can play.
  function loadLooks(kind, ids) {
    var A = art(), want = ids.filter(function (id) { var v = look(kind, id); return v && !v.builtin && !defOf(kind, id); });
    var done = function () {
      var ok = [];
      ids.forEach(function (id) {
        var v = look(kind, id);
        if (v && syncDef(v)) { ok.push(id); paintLook(v); }
        else if (v && !v.builtin) setState(v, "noload");
        else if (v && v.builtin) ok.push(id);
      });
      return ok;
    };
    if (!A || !A.load || !want.length) return Promise.resolve(done());
    return A.load(kind, want).then(done, done);
  }
  // what the page shows about a look once its file has arrived (its line) or failed (a chip)
  function paintLook(v) {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-by="' + v.key + '"]'), function (e) { e.textContent = v.by || ""; });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-name="' + v.key + '"]'), function (e) { e.textContent = v.name; });
  }
  function setState(v, s) {
    if (v.state === s) return;
    v.state = s;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-state="' + v.key + '"]'), function (e) {
      e.textContent = s === "noload" ? "DIDN'T LOAD" : s === "broke" ? "BROKE: PLAYED THE OLD ONE" : "";
      e.hidden = !s;
    });
  }

  /* ---------------- a look's tile ---------------- */
  // the small marks before a name: today's look, the reviewers' tier, off in the game, and trouble
  function chipsFor(v) {
    var out = [];
    if (v.builtin) out.push(h("span", "lab-tag", null, "TODAY"));
    if (v.tier === "A") out.push(h("span", "lab-tag is-a", { title: "The reviewers' A list" }, "A LIST"));
    else if (v.tier === "B") out.push(h("span", "lab-tag is-b", { title: "The reviewers' B list" }, "B LIST"));
    if (!v.on) out.push(h("span", "lab-tag is-off", null, "OFF IN GAME"));
    var st = h("span", "lab-tag is-bad", { "data-state": v.key }, "");
    st.hidden = true;
    out.push(st);
    return out;
  }
  // TRY IT: the real game with this look forced (?art=, test builds only), plus the game's own QA levers so the moment
  // actually comes up: ?force82= makes the season 82-0 (or 81-1 with the Heat Check's save), ?perk= lands the perk.
  // An 82-0 scene is forced as perfect:<id> (art-core's forced("perfect")): a plain scene:<id> never reaches the 82-0 deal.
  function tries(v) {
    var art1 = "?art=" + v.kind + ":" + v.id;
    if (v.kind === "scene" && v.perfect) return [["TRY IT AT 82\u20130", "?art=perfect:" + v.id + "&force82=1"]];
    if (v.kind === "goat") return [["TRY IT AT 82\u20130", art1 + "&force82=1"]];
    if (v.kind === "hot") return [["TRY THE SAVE IN PRESTI", art1 + "&force82=save"]];
    if (v.kind === "perk") return [["TRY REFUND IN PRESTI", art1 + "&perk=refund"], ["TRY FIRE SALE IN PRESTI", art1 + "&perk=sale"]];
    return [["TRY IT IN A REAL SEASON", art1]];
  }
  function tryHref(v) { return ROOT + tries(v)[0][1]; }
  function tryLink(v) {
    var live = LIVE_HOST.test(location.hostname || ""), box = h("div", "lab-tries");
    tries(v).forEach(function (t) {
      box.appendChild(h("a", "lab-try", { href: ROOT + t[1], target: "_blank", rel: "noopener" }, t[0] + " \u2197" + (live ? " (test builds only)" : "")));
    });
    return box;
  }
  // o: play (tapping the name plays it), playLabel, top (an element over the name: a print), body (one under it)
  function tile(v, o) {
    o = o || {};
    var t = h("article", "t-card lab-tile", { "data-key": v.key });
    if (o.top) t.appendChild(o.top);
    var main = o.play ? h("button", "lab-tile-main", { type: "button", onclick: function () { o.play(v); } }) : h("div", "lab-tile-main");
    var title = h("span", "lab-tile-title", null, chipsFor(v));
    title.appendChild(h("span", "lab-name", { "data-name": v.key }, v.name));
    if (o.play && o.playLabel !== false) title.appendChild(h("span", "lab-play", { html: PLAY + " " + (o.playLabel || "PLAY") }));
    main.appendChild(title);
    main.appendChild(h("span", "lab-by", { "data-by": v.key }, v.by || ""));
    if (v.note) main.appendChild(h("span", "lab-memo", null, v.note));
    t.appendChild(main);
    if (o.body) t.appendChild(o.body);
    t.appendChild(h("div", "lab-tile-foot", null, [tryLink(v), marks(v.key, false, v.name)]));
    t.classList.toggle("is-love", markOf(v.key) === "love");
    t.classList.toggle("is-noted", !!noteOf(v.key));
    t.classList.toggle("is-cut", markOf(v.key) === "cut");
    if (v.state) setTimeout(function () { var s = v.state; v.state = ""; setState(v, s); }, 0);
    return t;
  }
  function seg(label, opts, cur, onPick) {
    var wrap = h("div", null);
    if (label) wrap.appendChild(h("p", "t-head lab-seg-lab", { "data-head": "eyebrow" }, label));
    var row = h("div", "lab-seg", { role: "group", "aria-label": label || "Choose" });
    opts.forEach(function (op) {
      var b = h("button", null, { type: "button", "aria-pressed": op.k === cur ? "true" : "false" }, [op.label, op.sub ? h("small", null, null, op.sub) : null]);
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(row.children, function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
        onPick(op.k);
      });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    return wrap;
  }
  function empty(title, line) { return h("div", "lab-empty", null, [h("b", null, null, title), line]); }

  /* ---------------- the reel: app.js's cursor on a real card, in the page ---------------- */
  var MONTHS = [["OCT", 5], ["NOV", 15], ["DEC", 15], ["JAN", 15], ["FEB", 11], ["MAR", 15], ["APR", 6]];
  var TICK = 48, LEAD0 = 650, LEAD = 960, OPEN = 140, CLOSE = 120;   // ms, scaled by the season's pace (app.js)
  var CITIES = ["Atlanta", "Boston", "Brooklyn", "Charlotte", "Chicago", "Cleveland", "Dallas", "Denver", "Detroit",
    "Golden State", "Houston", "Indiana", "Los Angeles", "Memphis", "Miami", "Milwaukee", "Minnesota", "New Orleans",
    "New York", "Oklahoma City", "Orlando", "Philadelphia", "Phoenix", "Portland", "Sacramento", "San Antonio",
    "Toronto", "Utah", "Washington"];
  var BLAME = ["<b class=\"reel-blame\">Curry</b> shot 4 for 19.", "<b class=\"reel-blame\">Shaq</b> went 3 for 12 at the line.",
    "<b class=\"reel-blame\">Duncan</b> sat with five fouls.", "<b class=\"reel-blame\">Jordan</b> had the flu, and it showed.",
    "<b class=\"reel-blame\">LeBron</b> turned it over 8 times."];
  function monthOf(gi) { var g = gi, mi = 0; while (mi < MONTHS.length - 1 && g >= MONTHS[mi][1]) { g -= MONTHS[mi][1]; mi++; } return [mi, g]; }
  function monthStart(mi) { var s = 0; for (var i = 0; i < mi; i++) s += MONTHS[i][1]; return s; }
  function reelDate(gi) {
    var p = monthOf(gi), mi = p[0], n = MONTHS[mi][1], first = mi === 0 ? 21 : 1, last = mi === 0 ? 31 : mi === 6 ? 12 : mi === 4 ? 27 : 29;
    var mo = MONTHS[mi][0];
    return mo.charAt(0) + mo.slice(1).toLowerCase() + " " + (n === 1 ? first : Math.round(first + p[1] * (last - first) / (n - 1)));
  }
  function city(gi) { return CITIES[(gi * 7 + 3) % CITIES.length]; }

  /* Plays a scripted stretch on a real reel card in host. o = {
       host, games (0/1 for every game from opening night), prefill (games stamped at once, before the live part),
       plan (the loss looks in play order), dots, pace, slow (a slow-motion factor), clFor (k, realCl): the loss number
       the engine is told for the k-th live loss (it sets the moment's length: 1 the longest, 2-6 mid, 7-14 short),
       still (stop after the prefill), onUse (kind, id), onEnd, onSkip }
     The engine runs as in the game (its own frame loop and idle-time prep); the lab only moves the cursor. */
  function runReel(o) {
    var host = o.host, games = o.games, pace = o.pace || 1, slow = o.slow || 1;
    host.innerHTML = "";
    if (!win.T82RISO || !T82RISO.create) { host.appendChild(h("div", "lab-off", null, "The reel engine didn't load. Reload the page.")); return null; }
    var ov = h("div", "reel-overlay", { html: '<div class="reel-card"><div class="reel-head">' +
      '<span class="t-head reel-eyebrow" data-head="eyebrow">The season \u00B7 game by game</span>' +
      '<span class="reel-run mono" id="reelRun">0\u20130</span>' +
      '<button class="reel-skip mono t-btn" data-kind="quiet" data-size="sm" type="button">SKIP \u2192</button></div>' +
      '<div class="reel-acts"></div></div>' });
    host.appendChild(ov);
    var acts = ov.querySelector(".reel-acts"), runEl = ov.querySelector(".reel-run");
    var base = now(), w = 0, i;
    for (i = 0; i < games.length; i++) w += games[i] ? 1 : 0;
    var st = { alive: true, timers: [], gi: 0, cw: 0, cl: 0, told: 0, k: 0, streak: 0, lossRun: 0, mi: -1, left: 0, start: 0, mw: 0, ml: 0, row: null, recEl: null };
    var opts = { loss: (o.plan || []).slice(), dots: o.dots || "classic",
      onUse: function (kind, id) { setTimeout(function () { if (st.alive && o.onUse) o.onUse(kind, id); }, 0); } };
    if (slow !== 1) opts.clock = function () { var t = now(); return (base + (t - base) / slow) / 1000; };
    var R = null;
    try { R = T82RISO.create(ov, { games: games, wins: w, losses: games.length - w }, opts); } catch (e) { R = null; }
    runEl.removeAttribute("id");                       // the engine found its record by the game's id; the page may hold two reels
    if (!R) { host.innerHTML = ""; host.appendChild(h("div", "lab-off", null, "The riso reel is off on this device (no canvas).")); return null; }
    function later(fn, ms) { st.timers.push(setTimeout(fn, Math.max(0, ms) * slow)); }
    function stop() {
      if (!st.alive) return;
      st.alive = false;
      st.timers.forEach(clearTimeout); st.timers = [];
      try { R.destroy(); } catch (e) { /* cosmetic */ }
    }
    ov.querySelector(".reel-skip").addEventListener("click", function (ev) { ev.stopPropagation(); stop(); if (o.onSkip) o.onSkip(); });
    function openMonth() {
      st.mi++; st.start = st.gi; st.mw = 0; st.ml = 0; st.left = MONTHS[st.mi][1];
      var row = h("div", "reel-act", { html: '<div class="reel-mo-line"><span class="reel-mo">' + MONTHS[st.mi][0] + '</span><span class="reel-mo-rec mono">0\u20130</span></div>' +
        '<div class="reel-grid"></div><p class="reel-note reel-note-pending"></p>' });
      acts.appendChild(row);
      st.row = row; st.recEl = row.querySelector(".reel-mo-rec");
      R.openMonth(row, st.mi, MONTHS[st.mi][1]);
      acts.scrollTop = acts.scrollHeight;
    }
    function closeMonth() {
      var row = st.row;
      if (!row || row.__closed) return;
      row.__closed = true;
      var note = row.querySelector(".reel-note");
      note.innerHTML = st.ml === 0 && st.mw > 0 ? '<span class="riso-swept mono">SWEPT</span>' : BLAME[st.mi % BLAME.length];
      note.classList.remove("reel-note-pending");
      try { R.closeMonth(row, st.mi, st.mw, st.ml); } catch (e) { /* cosmetic */ }
      acts.scrollTop = acts.scrollHeight;
    }
    function stamp(instant) {
      var win1 = !!games[st.gi], prev = st.streak;
      if (win1) { st.cw++; st.mw++; st.streak++; st.lossRun = 0; }
      else { st.cl++; st.ml++; st.lossRun++; st.streak = 0; st.told = !instant && o.clFor ? o.clFor(st.k++, st.cl) : st.cl; }
      runEl.innerHTML = st.cw + "\u2013" + (st.cl ? "<i>" + st.cl + "</i>" : "0");
      st.recEl.textContent = st.mw + "\u2013" + st.ml;
      var info = { gi: st.gi, cw: st.cw, cl: st.told || st.cl, streak: st.streak, prevStreak: prev, lossRun: st.lossRun,
        city: city(st.gi), date: reelDate(st.gi), instant: !!instant, pace: pace };
      var hold = 0;
      try { hold = R.stamp(st.row, st.gi - st.start, win1, info) || 0; } catch (e) { hold = 0; }
      if (st.told && st.told !== st.cl) runEl.innerHTML = st.cw + "\u2013" + (st.cl ? "<i>" + st.cl + "</i>" : "0");
      st.gi++; st.left--;
      return instant ? 0 : hold;
    }
    function tick() {
      if (!st.alive) return;
      var hold = stamp(false);
      if (st.gi >= games.length) { finish(hold); return; }
      if (st.left === 0) { if (hold) later(advance, hold); else advance(); }
      else later(tick, TICK * pace + hold);
    }
    function advance() {
      if (!st.alive) return;
      var lead = (st.mi < 0 ? LEAD0 : LEAD) * pace;
      if (st.mi >= 0) later(closeMonth, CLOSE * pace);
      later(function () { if (!st.alive) return; openMonth(); later(tick, OPEN * pace); }, lead);
    }
    function finish(hold) {
      later(function () { if (st.alive && st.left === 0) closeMonth(); }, hold + CLOSE * pace);
      later(function () { stop(); if (o.onEnd) o.onEnd(); }, hold + 700);
    }
    var pre = Math.min(o.prefill || 0, games.length);
    while (st.gi < pre) {
      if (st.mi < 0 || st.left === 0) { closeMonth(); openMonth(); }
      stamp(true);
    }
    acts.scrollTop = acts.scrollHeight;
    if (o.still || st.gi >= games.length) { if (st.left === 0) closeMonth(); later(stop, 900); }
    else if (st.mi < 0) advance();
    else if (st.left === 0) advance();
    else later(tick, Math.max(700, OPEN * pace));      // the engine's gate opens and the first look preps in the meantime
    return { stop: stop, R: R, st: st, ov: ov };
  }

  // Scrolls up or down (never sideways) just enough that el sits clear of the screen's top and the picks bar.
  function revealY(el, pad) {
    var r = el.getBoundingClientRect(), vh = (win.innerHeight || 700) - 76, y = 0;
    if (r.top < 8) y = r.top - 8 - (pad || 0);
    else if (r.bottom > vh) y = Math.min(r.bottom - vh, r.top - 8);
    if (y) win.scrollTo({ top: Math.max(0, win.pageYOffset + y), behavior: "smooth" });
  }

  /* ---------------- shared state: what is running, and the idle printing queue ---------------- */
  var CUR = "loss";                                      // the open tab
  var BUILT = {};                                        // tab -> its pane's api
  var JOBS = [], jobOn = false;
  // one print job per idle moment, the one nearest the screen first; a job of a closed tab is dropped
  function queue(tab, el, fn) { JOBS.push({ tab: tab, el: el, fn: fn }); pump(); }
  function pump() { if (jobOn || !JOBS.length) return; jobOn = true; idle(step); }
  function step() {
    jobOn = false;
    JOBS = JOBS.filter(function (j) { return j.tab === CUR && doc.body.contains(j.el); });
    if (!JOBS.length || doc.hidden) return;
    var vh = win.innerHeight || 700, best = 0, bd = 1e9;
    for (var i = 0; i < JOBS.length; i++) {
      var r = JOBS[i].el.getBoundingClientRect(), d = r.bottom < 0 ? -r.bottom : r.top > vh ? r.top - vh : 0;
      if (d < bd) { bd = d; best = i; if (!d) break; }
    }
    var j = JOBS.splice(best, 1)[0];
    try { j.fn(); } catch (e) { if (win.console && console.warn) console.warn("[art-lab] a print job failed:", e); }
    pump();
  }
  function stopAll() {
    Object.keys(BUILT).forEach(function (k) { try { if (BUILT[k].stop) BUILT[k].stop(); } catch (e) { /* cosmetic */ } });
    fxStop();
  }

  /* ================= THE L ================= */
  var MODES = {
    first: { label: "1.7 s", sub: "FIRST LOSS", pace: 1, run: [5, 7], cl: function () { return 1; } },
    mid: { label: "1.05 s", sub: "MID-SEASON", pace: 1, run: [1, 3], cl: function (k) { return 2 + k % 5; } },
    late: { label: "0.45 s", sub: "BAD YEAR, LATE", pace: 0.643, run: [0, 2], cl: function (k) { return 7 + k % 5; } }
  };
  // a stretch of a season: n losses, each after a short run of wins (a first-loss stretch: each after a streak)
  function stretch(mode, n) {
    var M = MODES[mode], g = [], k, i;
    for (k = 0; k < n; k++) {
      var w = M.run[0] + rnd(M.run[1] - M.run[0] + 1);
      if (k === 0) w = Math.max(w, 2);
      for (i = 0; i < w; i++) g.push(1);
      g.push(0);
    }
    return g.slice(0, 82);
  }
  // one look, in the moment of its kind: after an 8-game streak; in February of a great year (the L above the
  // wound); the 14th loss of a bad year, fast (the QA bench's three cases)
  function single(mode) {
    if (mode === "first") return { games: ones(8).concat([0]), prefill: 7 };
    if (mode === "late") return { games: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0], prefill: 20 };
    var g = ones(59); [7, 16, 27, 41, 58].forEach(function (i) { g[i] = 0; });
    return { games: g, prefill: 57 };
  }
  function paneLoss(pane) {
    var kind = "loss", list = LIST.loss || [];
    var S = { mode: MODES[UI.lossMode] ? UI.lossMode : "mid", run: null, seq: null, cur: null };
    var stage = h("div", "lab-stage");
    var now1 = { box: h("div", "lab-now") };
    now1.chips = h("span", "lab-tile-title");
    now1.count = h("span", "lab-now-count");
    now1.name = h("p", "lab-now-name", null, "Pick a look");
    now1.by = h("p", "lab-now-by", null, "Tap PLAY 10 IN A ROW, or any look below to play it here.");
    now1.marks = marks("loss/none", true);
    now1.prev = h("button", "lab-mk", { type: "button", "aria-label": "The look before", html: PREV });
    now1.next = h("button", "lab-mk", { type: "button", "aria-label": "The next look", html: NEXT });
    now1.tryEl = h("a", "lab-try lab-now-try", { href: "#", target: "_blank", rel: "noopener" }, "");
    var acts = h("div", "lab-now-acts");
    Array.prototype.slice.call(now1.marks.children).forEach(function (b) { acts.appendChild(b); });
    acts.appendChild(now1.prev); acts.appendChild(now1.next);
    add(now1.box, [h("div", "lab-now-top", null, [now1.chips, now1.count]), now1.name, now1.by, acts, now1.tryEl]);
    now1.tryEl.hidden = true;
    setNowMarks(null);

    var b10 = h("button", "t-btn", { type: "button" }, "PLAY 10 IN A ROW");
    var bAll = h("button", "t-btn", { type: "button", "data-kind": "quiet" }, "PLAY ALL " + list.length);
    var note = h("p", "lab-note", null, "");
    function noteText() {
      var keep = list.filter(function (v) { return markOf(v.key) !== "cut"; }).length;
      note.textContent = list.length < 10 ? "Only " + list.length + (list.length === 1 ? " look" : " looks") + " so far, so they take turns in the ten."
        : "The ten are drawn at random from the " + keep + " you haven't cut, one per loss, like a real bad year.";
    }
    noteText();

    function setNowMarks(v) {
      var key = v ? v.key : "";
      Array.prototype.forEach.call(acts.querySelectorAll("[data-m]"), function (b) {
        b.setAttribute("data-mk", key); b.disabled = !v;
        b.setAttribute("aria-pressed", v && markOf(key) === b.getAttribute("data-m") ? "true" : "false");
      });
      Array.prototype.forEach.call(acts.querySelectorAll("[data-nk]"), function (b) {
        b.setAttribute("data-nk", key); b.setAttribute("data-nn", v ? v.name : ""); b.disabled = !v;
        b.setAttribute("aria-pressed", v && noteOf(key) ? "true" : "false");
      });
      syncOpen();
      now1.prev.disabled = now1.next.disabled = !list.length;
    }
    function showNow(v, n, of) {
      S.cur = v;
      now1.chips.innerHTML = "";
      if (v) add(now1.chips, chipsFor(v).filter(function (c) { return !c.hasAttribute("data-state"); }));
      now1.name.textContent = v ? v.name : "Pick a look";
      now1.by.textContent = v ? (v.by || v.note || "") : "";
      now1.count.textContent = of ? n + " OF " + of : "";
      if (v) { now1.tryEl.href = tryHref(v); now1.tryEl.textContent = tries(v)[0][0] + " \u2197" + (LIVE_HOST.test(location.hostname || "") ? " (test builds only)" : ""); }
      now1.tryEl.hidden = !v;
      setNowMarks(v);
      Array.prototype.forEach.call(pane.querySelectorAll(".lab-tile.is-playing"), function (t) { t.classList.remove("is-playing"); });
      if (v) Array.prototype.forEach.call(pane.querySelectorAll('.lab-tile[data-key="' + v.key + '"]'), function (t) { t.classList.add("is-playing"); });
    }
    function busy(which) {
      b10.textContent = which === "ten" ? "\u25A0 STOP" : "PLAY 10 IN A ROW";
      bAll.textContent = which === "all" ? "\u25A0 STOP" : "PLAY ALL " + list.length;
    }
    function stop() {
      S.seq = null;
      if (S.run) S.run.stop();
      S.run = null;
      busy("");
    }
    function idleCard() {
      var g = stretch("mid", 9);
      S.run = runReel({ host: stage, games: g, prefill: g.length, still: true, plan: [] });
    }
    function playOne(v, scroll) {
      stop();
      var token = S.seq = { single: true };
      showNow(v, 0, 0);
      if (scroll) scrollToStage();
      loadLooks(kind, [v.id]).then(function (ok) {
        if (S.seq !== token) return;
        if (!ok.length) { now1.by.textContent = "This look's file didn't load, so there's nothing to play."; S.seq = null; return; }
        now1.by.textContent = v.by || v.note || "";
        var sc = single(S.mode), M = MODES[S.mode];
        S.run = runReel({ host: stage, games: sc.games, prefill: sc.prefill, plan: [v.id], pace: M.pace,
          onEnd: function () { if (S.seq === token) S.seq = null; checkBroke([v]); }, onSkip: stop });
      });
    }
    function playSeq(ids, which) {
      stop();
      var token = S.seq = { ids: ids, i: 0, n: 0, which: which };
      busy(which);
      showNow(null, 0, ids.length);
      now1.name.textContent = "Loading " + ids.length + (ids.length === 1 ? " look" : " looks") + "\u2026";
      now1.by.textContent = "";
      scrollToStage();
      loadLooks(kind, ids).then(function (ok) {
        if (S.seq !== token) return;
        token.ids = ids.filter(function (id) { return ok.indexOf(id) >= 0; });
        if (!token.ids.length) { stop(); showNow(null); now1.by.textContent = "None of these looks loaded."; return; }
        chunk();
      });
      function chunk() {
        if (S.seq !== token) return;
        if (token.i >= token.ids.length) { stop(); now1.count.textContent = "DONE \u00B7 " + token.ids.length; return; }
        var part = token.ids.slice(token.i, token.i + 10), M = MODES[S.mode];
        token.i += part.length;
        S.run = runReel({ host: stage, games: stretch(S.mode, part.length), prefill: 0, plan: part, pace: M.pace, clFor: M.cl,
          onUse: function (k, id) { if (S.seq !== token || k !== "loss") return; token.n++; showNow(look(kind, id), token.n, token.ids.length); },
          onEnd: function () { checkBroke(part.map(function (id) { return look(kind, id); })); setTimeout(chunk, 500); },
          onSkip: stop });
      }
    }
    // a look that threw played the classic L instead: say so on its tile
    function checkBroke(vs) {
      var off = [];
      try { off = (S.run && S.run.R && S.run.R.qa && S.run.R.qa.state().off) || []; } catch (e) { off = []; }
      vs.forEach(function (v) { if (v && off.indexOf("loss:" + v.id) >= 0) setState(v, "broke"); });
    }
    // the card at the top of the screen, what is playing under it, both clear of the picks bar
    function scrollToStage() {
      var r = stage.getBoundingClientRect(), n = now1.box.getBoundingClientRect(), vh = win.innerHeight || 700;
      if (r.top < 0 || n.bottom > vh - 64) win.scrollTo({ top: Math.max(0, win.pageYOffset + r.top - 8), behavior: "smooth" });
    }
    function ten() {
      var pool = list.filter(function (v) { return markOf(v.key) !== "cut" && v.state !== "noload"; }).map(function (v) { return v.id; });
      if (pool.length < 2) pool = list.map(function (v) { return v.id; });
      var out = [];
      while (out.length < 10 && pool.length) {
        var c = shuffle(pool.slice());
        if (out.length && c.length > 1 && c[0] === out[out.length - 1]) { var t = c[0]; c[0] = c[1]; c[1] = t; }
        out = out.concat(c);
      }
      return out.slice(0, 10);
    }
    b10.addEventListener("click", function () { if (S.seq && S.seq.which === "ten") { stop(); return; } playSeq(ten(), "ten"); });
    bAll.addEventListener("click", function () { if (S.seq && S.seq.which === "all") { stop(); return; } playSeq(list.map(function (v) { return v.id; }), "all"); });
    function step1(d) {
      if (!list.length) return;
      var i = S.cur ? list.indexOf(S.cur) : -1;
      playOne(list[(i + d + list.length) % list.length], false);
    }
    now1.prev.addEventListener("click", function () { step1(-1); });
    now1.next.addEventListener("click", function () { step1(1); });

    add(pane, [h("div", "lab-row", null, [b10, bAll]), note,
      seg("How long each L holds", Object.keys(MODES).map(function (k) { return { k: k, label: MODES[k].label, sub: MODES[k].sub }; }), S.mode, function (k) {
        S.mode = k; UI.lossMode = k; saveUI();
      }),
      stage, now1.box,
      h("h2", "t-head lab-h", { "data-head": "rule" }, "Every L \u00B7 " + list.length)]);
    var grid = h("div", "lab-list");
    list.forEach(function (v) { grid.appendChild(tile(v, { play: function (x) { playOne(x, true); } })); });
    pane.appendChild(grid);
    // the lines arrive with the files: load them all now, in the background
    loadLooks(kind, list.map(function (v) { return v.id; })).then(function () { if (S.cur && !S.seq) now1.by.textContent = S.cur.by || S.cur.note || ""; });
    idleCard();
    return { stop: stop, refresh: noteText };
  }

  /* ================= THE DOTS ================= */
  // A great year (the bench's ledger: streaks of 10, 20 and 30) and a bad one.
  var YEARS = {
    great: (function () { var r = function (n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; };
      return [].concat(r(10, 1), [0], r(20, 1), [0, 0], r(30, 1), [0, 0, 0], r(3, 1), [0], r(2, 1), [0, 0], r(4, 1), [0], [1], [0, 0]); })(),
    bad: seasonOf(25, 5741)
  };
  function bestMonth(games) {                            // the month with the most going on: wins and losses mixed
    var best = 0, score = -1;
    for (var mi = 0; mi < MONTHS.length; mi++) {
      var s0 = monthStart(mi), w = 0, l = 0;
      for (var i = s0; i < s0 + MONTHS[mi][1]; i++) { if (games[i]) w++; else l++; }
      var sc = Math.min(w, l) * 2 + (MONTHS[mi][1] >= 15 ? 1 : 0);
      if (sc > score) { score = sc; best = mi; }
    }
    return best;
  }
  function paneDots(pane) {
    var kind = "dots", list = LIST.dots || [];
    if (!win.T82RISO || !T82RISO.strip) { pane.appendChild(empty("The reel engine didn't load", "Reload the page.")); return {}; }
    var S = { year: YEARS[UI.dotsYear] ? UI.dotsYear : "great", slow: !!UI.dotsSlow, mini: null, miniHost: null };
    var tiles = [];
    function stop() { if (S.mini) S.mini.stop(); S.mini = null; }
    function watch(v, host) {
      stop();
      if (S.miniHost && S.miniHost !== host) S.miniHost.innerHTML = "";
      S.miniHost = host;
      loadLooks(kind, [v.id]).then(function () {
        if (S.miniHost !== host || CUR !== "dots") return;
        var games = YEARS[S.year], mi = S.year === "great" ? 2 : bestMonth(games), s0 = monthStart(mi);
        S.mini = runReel({ host: host, games: games.slice(0, s0 + MONTHS[mi][1]), prefill: s0, plan: [], dots: v.id, slow: S.slow ? 3 : 1,
          clFor: function (k, real) { return real + 14; },
          onEnd: function () { S.mini = null; checkDots(v); } });
        if (S.mini) revealY(host, 0);
      });
    }
    function checkDots(v) {
      var bad = false;
      Array.prototype.forEach.call(pane.querySelectorAll('.lab-tile[data-key="' + v.key + '"] canvas.riso-strip'), function (c) {
        if (v.id !== "classic" && c.getAttribute("data-dots") !== v.id && c.closest(".lab-mini")) bad = true;
      });
      if (bad) setState(v, "broke");
    }
    // the settled season, month by month, as strip() reprints it
    function ledger(v, box) {
      box.innerHTML = "";
      var games = YEARS[S.year], d = dpr(), cssW = Math.max(120, box.clientWidth - 16), gi = 0, cl = 0, streak = 0, streaks = [];
      games.forEach(function (g) { streak = g ? streak + 1 : 0; streaks.push(g ? streak : 0); });
      for (var mi = 0; mi < MONTHS.length; mi++) {
        var n = MONTHS[mi][1], part = games.slice(gi, gi + n);
        var c = T82RISO.strip({ games: part, streaks: streaks.slice(gi, gi + n), gi0: gi, cl0: cl, mi: mi, cssW: cssW, d: d, dots: v.id });
        c.className = "riso-strip";
        c.style.width = Math.round(c.width / d) + "px";
        c.setAttribute("aria-hidden", "true");
        box.appendChild(c);
        part.forEach(function (g) { if (!g) cl++; });
        gi += n;
      }
    }
    function refill() {
      tiles.forEach(function (t) {
        if (t.box.getAttribute("data-year") === S.year) return;
        t.box.innerHTML = ""; t.box.appendChild(h("div", "lab-ledger-wait", null, "PRINTING THE SEASON\u2026"));
        queue("dots", t.box, function () {
          loadLooks(kind, [t.v.id]).then(function () { queue("dots", t.box, function () { ledger(t.v, t.box); t.box.setAttribute("data-year", S.year); }); });
        });
      });
    }
    add(pane, [
      seg("The season they print", [{ k: "great", label: "70\u201312", sub: "A GREAT YEAR" }, { k: "bad", label: "25\u201357", sub: "A BAD YEAR" }], S.year, function (k) {
        S.year = k; UI.dotsYear = k; saveUI(); stop(); if (S.miniHost) S.miniHost.innerHTML = ""; refill();
      }),
      seg("Watching a month", [{ k: "real", label: "REAL SPEED" }, { k: "slow", label: "SLOW-MO", sub: "3X SLOWER" }], S.slow ? "slow" : "real", function (k) {
        S.slow = k === "slow"; UI.dotsSlow = S.slow; saveUI();
      }),
      h("p", "lab-note", null, "Losses play light while you watch, so the big L stays out of the way of the dots."),
      h("h2", "t-head lab-h", { "data-head": "rule" }, "Every set \u00B7 " + list.length)]);
    var grid = h("div", "lab-list is-two");
    list.forEach(function (v) {
      var body = h("div", null), mini = h("div", "lab-mini"), box = h("div", "lab-ledger", { role: "img", "aria-label": v.name + ": a whole season's ledger" });
      var watchBtn = h("button", "t-btn", { type: "button", "data-kind": "quiet" }, "\u25B6 WATCH A MONTH");
      watchBtn.style.width = "100%";
      watchBtn.addEventListener("click", function () { watch(v, mini); });
      box.addEventListener("click", function () { watch(v, mini); });
      add(body, [mini, box, h("div", "lab-under", null, watchBtn)]);
      grid.appendChild(tile(v, { body: body, play: function () { watch(v, mini); }, playLabel: false }));
      tiles.push({ v: v, box: box });
    });
    pane.appendChild(grid);
    loadLooks(kind, list.map(function (v) { return v.id; }));
    refill();
    return { stop: stop, reopen: refill };
  }

  /* ================= THE PICTURE and 82-0: the results print ================= */
  var ROSTER = [{ slot: "G", name: "Stephen Curry", yr: "'16" }, { slot: "G", name: "Michael Jordan", yr: "'96" },
    { slot: "F", name: "LeBron James", yr: "'13" }, { slot: "F", name: "Tim Duncan", yr: "'03" }, { slot: "C", name: "Shaquille O'Neal", yr: "'00" }];
  var RECORDS = [{ k: 64, label: "64\u201318", sub: "GREAT" }, { k: 50, label: "50\u201332", sub: "GOOD" }, { k: 41, label: "41\u201341", sub: "COIN FLIP" }, { k: 25, label: "25\u201357", sub: "LOST" }];
  var LIGHTS = [{ k: "golden", label: "GOLDEN" }, { k: "dusk", label: "DUSK" }, { k: "night", label: "NIGHT" }];
  // the spec app.js's resultsPrintSpec builds, for a fixed five
  function printSpec(w, scene, pal) {
    var games = w >= 82 ? ones(82) : seasonOf(w, 82 + w * 977), net = (w - 41) * 0.36;
    return { games: games, wins: w, saved: null, context: "CLASSIC MODE",
      names: ROSTER.map(function (r) { return r.yr + " " + r.name.split(" ").pop(); }), roster: ROSTER,
      net: (net >= 0 ? "+" : "\u2212") + Math.abs(net).toFixed(1), comp: w >= 82 ? "Greatest of all GOATs" : w >= 60 ? "Better than the '86 Celtics" : "",
      seed: 4000 + w * 13, pal: pal, scene: scene };
  }
  // A print pane's tiles: each banner prints once in an idle moment (to an image, so a phone holds no live canvas for
  // it), and a tap mounts the real print in its place and plays the reveal (and a perfect scene's live part).
  function printer(tab) {
    var P = { live: null, tiles: [] };
    function stopLive() {
      var L = P.live;
      P.live = null;
      if (!L) return;
      try { L.M.destroy(); } catch (e) { /* cosmetic */ }
      if (L.wrap.parentNode) L.wrap.parentNode.removeChild(L.wrap);
      L.art.classList.remove("is-live");
      Array.prototype.forEach.call(L.art.children, function (c) { if (c !== L.wrap) c.hidden = false; });
    }
    function bake(t) {
      var spec = t.spec(), sig = JSON.stringify([spec.wins, spec.pal, spec.scene]);
      if (t.sig === sig) return;
      var art1 = t.art, d = dpr(), cssW = Math.max(200, art1.clientWidth || 343), out;
      art1.classList.remove("is-stale");
      try { out = T82PRINT.print(spec, { width: Math.round(cssW * d), dpr: d }); } catch (e) { out = null; }
      if (!out) { art1.innerHTML = ""; art1.appendChild(h("div", "lab-art-wait", null, "THIS ONE DIDN'T PRINT")); return; }
      var c = doc.createElement("canvas"), g = c.getContext("2d");
      c.width = out.print.width; c.height = out.print.height;
      if (out.filter && out.filter !== "none" && "filter" in g) g.filter = out.filter;
      g.drawImage(out.print, 0, 0);
      g.filter = "none";
      g.drawImage(out.names, 0, 0);
      out.print.width = out.print.height = out.names.width = out.names.height = 0;
      if (t.v && !t.v.builtin && out.scene && out.scene !== spec.scene) setState(t.v, "broke");
      t.sig = sig;
      var put = function (node) {
        if (P.live && P.live.art === art1) stopLive();
        art1.innerHTML = "";
        art1.appendChild(node);
        art1.appendChild(h("span", "lab-art-tap", null, "TAP TO REVEAL"));
      };
      if (c.toBlob && win.URL && URL.createObjectURL) {
        c.toBlob(function (blob) {
          if (!blob || t.sig !== sig) { if (t.sig === sig) { c.className = "lab-still"; put(c); } return; }
          var img = new Image();
          img.alt = "";
          img.onload = function () { if (t.url) URL.revokeObjectURL(t.url); t.url = img.src; c.width = c.height = 0; };
          img.src = URL.createObjectURL(blob);
          put(img);
        }, "image/png");
      } else { c.className = "lab-still"; put(c); }
    }
    function reveal(t) {
      var was = P.live && P.live.art === t.art;
      stopLive();
      if (!win.T82PRINT) return;
      var wrap = h("div", "rr"), host = h("div", "rr-print");
      wrap.appendChild(host);
      Array.prototype.forEach.call(t.art.children, function (c) { c.hidden = true; });
      t.art.appendChild(wrap);
      t.art.classList.add("is-live");
      var M = null;
      try { M = T82PRINT.mount(host, t.spec(), { defer: true }); } catch (e) { M = null; }
      if (!M) { t.art.removeChild(wrap); t.art.classList.remove("is-live"); Array.prototype.forEach.call(t.art.children, function (c) { c.hidden = false; }); return; }
      P.live = { art: t.art, wrap: wrap, M: M };
      M.play();
      if (!was) revealY(t.art, 0);
    }
    function card(v, spec, o) {
      o = o || {};
      var art1 = h("button", "lab-art", { type: "button", "aria-label": "Play the reveal of " + v.name });
      art1.appendChild(h("div", "lab-art-wait", null, "PRINTING\u2026"));
      var t = { v: v, art: art1, spec: spec, sig: "" };
      art1.addEventListener("click", function () { reveal(t); });
      P.tiles.push(t);
      if (o.today) return h("article", "t-card lab-tile lab-today", null, [art1, h("span", "lab-tile-main", null, [
        h("span", "lab-tile-title", null, h("span", "lab-name", null, o.today)), h("span", "lab-by", null, o.line || "")])]);
      return tile(v, { top: art1, play: function () { reveal(t); }, playLabel: "REVEAL" });
    }
    function refill() {
      P.tiles.forEach(function (t) {
        var spec = t.spec(), sig = JSON.stringify([spec.wins, spec.pal, spec.scene]);
        if (t.sig === sig) return;
        if (P.live && P.live.art === t.art) stopLive();
        if (t.sig) t.art.classList.add("is-stale");
        queue(tab, t.art, function () {
          var go = function () { queue(tab, t.art, function () { bake(t); }); };
          if (t.v && !t.v.builtin && !defOf("scene", t.v.id)) loadLooks("scene", [t.v.id]).then(go); else go();
        });
      });
    }
    return { card: card, refill: refill, stop: stopLive, P: P };
  }
  // every scene file, once: THE PICTURE and 82-0 both need to know which scenes are perfect
  var scenesP = null;
  function loadScenes() {
    if (scenesP) return scenesP;
    var list = LIST.scene || [];
    scenesP = loadLooks("scene", list.map(function (v) { return v.id; })).then(function () {
      list.forEach(function (v) { syncDef(v); });
      if (win.T82PRINT && T82PRINT.fonts) return T82PRINT.fonts().then(function () {}, function () {});
    });
    return scenesP;
  }
  function paneScenes(pane, perfect) {
    var tab = perfect ? "perfect" : "picture", pr = printer(tab);
    var S = { rec: perfect ? 82 : (+UI.rec || 64), light: UI[perfect ? "perfLight" : "light"] || "golden" };
    if (!perfect && !RECORDS.some(function (r) { return r.k === S.rec; })) S.rec = 64;
    var wait = h("p", "lab-note", null, "Loading the scenes\u2026");
    var top = h("div", null), grid = h("div", "lab-list is-two"), extra = h("div", null);
    add(pane, [top, wait, grid, extra]);
    if (!perfect) top.appendChild(seg("The record", RECORDS, S.rec, function (k) { S.rec = k; UI.rec = k; saveUI(); pr.refill(); }));
    top.appendChild(seg("The light", LIGHTS, S.light, function (k) { S.light = k; UI[perfect ? "perfLight" : "light"] = k; saveUI(); pr.refill(); }));
    if (perfect) top.appendChild(h("h2", "t-head lab-h", { "data-head": "rule" }, "The perfect print"));
    var api = { stop: pr.stop, reopen: pr.refill };
    loadScenes().then(function () {
      wait.parentNode && wait.parentNode.removeChild(wait);
      var list = (LIST.scene || []).filter(function (v) { return !!v.perfect === !!perfect; });
      if (!perfect) top.appendChild(h("h2", "t-head lab-h", { "data-head": "rule" }, "Every picture \u00B7 " + list.length));
      if (!win.T82PRINT) { grid.appendChild(empty("The print engine didn't load", "Reload the page.")); return; }
      if (!list.length) grid.appendChild(empty(perfect ? "No perfect scenes yet" : "No scenes yet",
        perfect ? "When a scene marked perfect lands in art/scene, it prints here for an 82-0 season." : "The lake is the only print so far."));
      list.forEach(function (v) {
        grid.appendChild(pr.card(v, function () { return printSpec(S.rec, v.id, S.light); }));
      });
      if (perfect) {
        extra.appendChild(h("h2", "t-head lab-h", { "data-head": "rule" }, "For contrast: today"));
        var lake = look("scene", "lake") || lookOf("scene", "lake", { name: "Lake", builtin: true });
        extra.appendChild(pr.card(lake, function () { return printSpec(82, "lake", S.light); },
          { today: "82\u20130 today", line: "What a perfect season prints now: the lake, like any other year." }));
        extra.appendChild(pr.card(lake, function () { return printSpec(81, "lake", S.light); },
          { today: "81\u20131 today", line: "One loss short. 82-0 has to beat this by a mile." }));
      }
      pr.refill();
      tabCount();
    });
    return api;
  }

  /* ================= the FX layer: Hot Hand, perks, 82-0 fireworks ================= */
  var FXS = { last: "", timers: [] };
  function fxReady() { return !!(win.T82FX && T82FX.play); }
  function fxStop() {
    FXS.timers.forEach(clearTimeout); FXS.timers = [];
    FXS.last = "";
    if (fxReady()) { try { T82FX.stop(); } catch (e) { /* cosmetic */ } }   // leaving the tab frees every printed plate
  }
  function fxLater(fn, ms) { FXS.timers.push(setTimeout(fn, ms)); }
  function fxPending(v) {
    try { var st = T82FX.qa && T82FX.qa.state ? T82FX.qa.state() : null, p = st && st.packs ? st.packs[v.kind + ":" + v.id] : null; return p ? p.pending : 0; }
    catch (e) { return 0; }
  }
  // A pack prints its plates (its riso emoji, its screened shapes) in idle moments once its tile comes near the screen,
  // so a tap plays at once; T82FX.stop() frees them all when the tab closes, and coming back prints them again.
  var FXIO = null;
  function fxTab(kind) { return kind === "goat" ? "perfect" : kind; }
  function fxObserve(t, v) {
    if (!fxReady() || !win.IntersectionObserver) return;
    if (!FXIO) FXIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        var x = en.target.__fxv;
        if (!en.isIntersecting || !x || CUR !== fxTab(x.kind)) return;
        loadLooks(x.kind, [x.id]).then(function () { if (CUR === fxTab(x.kind)) { try { T82FX.prime(x.kind, x.id); } catch (e) { /* plays unprimed */ } } });
      });
    }, { rootMargin: "50% 0px 50% 0px" });
    t.__fxv = v;
    FXIO.observe(t);
  }
  // Before a pack's beat: its file and its plates. A tap that beats the idle printing says so (wait(true)) and plays
  // once the plates are in, so the first play never stalls mid-flight. Another pack's sequence or volley stops.
  function fxPrep(v, wait) {
    return loadLooks(v.kind, [v.id]).then(function () {
      return new Promise(function (res) {
        if (!fxReady()) { res(false); return; }
        if (FXS.last !== v.key) { FXS.timers.forEach(clearTimeout); FXS.timers = []; }
        FXS.last = v.key;
        try { T82FX.prime(v.kind, v.id); } catch (e) { /* plays unprimed */ }
        var t0 = Date.now(), told = false;
        (function poll() {
          if (fxPending(v) <= 0 || Date.now() - t0 > 6000) { if (told && wait) wait(false); res(true); return; }
          if (!told && wait) { told = true; wait(true); }
          setTimeout(poll, 50);
        })();
      });
    });
  }
  function fxPlay(v, slot, el, o) {
    if (!fxReady()) return 0;
    var opts = { id: v.id, seed: (Math.random() * 4294967295) >>> 0 }, k;
    if (o) for (k in o) if (o.hasOwnProperty(k)) opts[k] = o[k];
    var ms = 0;
    try { ms = +T82FX.play(v.kind, slot, el, opts) || 0; } catch (e) { ms = 0; }
    fxLater(function () {
      try { var off = T82FX.qa.state().off || []; if (!v.builtin && off.indexOf(v.kind + ":" + v.id) >= 0) setState(v, "broke"); } catch (e) { /* cosmetic */ }
    }, 120);
    return ms;
  }
  function fxMissing(pane, what) {
    pane.appendChild(empty("The riso FX layer hasn't landed", "riso-fx.js isn't on this build yet, so the " + what + " can't play here. Check back after the next release."));
  }
  function btn(label, kind, onClick) {
    var b = h("button", "t-btn", { type: "button", "data-kind": kind || null }, label);
    b.addEventListener("click", onClick);
    return b;
  }

  /* ---- Hot Hand ---- */
  var TIERS = [{ s: "cold", label: "COLD", lvl: 0 }, { s: "warm", label: "WARM", lvl: 1 }, { s: "hot", label: "HOT", lvl: 2 },
    { s: "fire", label: "ON FIRE", lvl: 3 }, { s: "nova", label: "SUPERNOVA", lvl: 4 }];
  function heatMock() {
    var segs = "", i;
    for (i = 0; i < 5; i++) segs += '<div class="hh-seg lvl' + i + '"></div>';
    var m = h("div", "lab-mock is-hh", { html: '<div class="hh-card"><div class="hh-heat">' + segs + '</div>' +
      '<div class="lab-hh-slot"><div class="hh-heatlabel lvl1">HEAT CHECK</div></div><div class="hh-netcap">TAP A BEAT</div></div>' });
    return { el: m, card: m.firstChild, segs: m.querySelectorAll(".hh-seg"), slot: m.querySelector(".lab-hh-slot"), cap: m.querySelector(".hh-netcap"), capNow: "TAP A BEAT" };
  }
  // the wheel locks on a tier (its label lights), or the verdict lands (the final record); returns the beat's anchor
  function heatSet(mk, slot) {
    var t = null, i, at;
    TIERS.forEach(function (x) { if (x.s === slot) t = x; });
    for (i = 0; i < 5; i++) {
      mk.segs[i].classList.toggle("fill", !!t && i <= t.lvl);
      mk.segs[i].classList.toggle("lit", !!t && i === t.lvl);
      mk.segs[i].classList.toggle("result", !!t && i === t.lvl);
    }
    mk.slot.innerHTML = "";
    if (t) {
      at = h("div", "hh-heatlabel lvl" + t.lvl, null, t.label);
      mk.cap.textContent = mk.capNow = "THE WHEEL LOCKS";
    } else {
      at = h("div", "hh-stamp" + (slot === "save" ? "" : " miss"), null, slot === "save" ? "82\u20130" : "81\u20131");
      mk.cap.textContent = mk.capNow = slot === "save" ? "THE SAVE: FINAL RECORD" : "NO SAVE: FINAL RECORD";
      if (slot === "save") for (i = 0; i < 5; i++) mk.segs[i].classList.add("fill");
    }
    mk.slot.appendChild(at);
    return at;
  }
  function paneHot(pane) {
    if (!fxReady()) { fxMissing(pane, "Hot Hand packs"); return { stop: function () {} }; }
    var list = LIST.hot || [];
    pane.appendChild(h("h2", "t-head lab-h", { "data-head": "rule" }, "Every pack \u00B7 " + list.length));
    if (list.length < 2) pane.appendChild(h("p", "lab-note", null, "Only today's look so far. New packs land in art/hot."));
    var grid = h("div", "lab-list is-two");
    list.forEach(function (v) {
      var mk = heatMock(), beats = h("div", "lab-beats"), running = { seq: null };
      function wait(on) { mk.cap.textContent = on ? "PRINTING THE INKS\u2026" : mk.capNow; }
      function beat(slot) {
        running.seq = null;
        heatSet(mk, slot);
        return fxPrep(v, wait).then(function () { return fxPlay(v, slot, mk.slot.firstChild, { big: slot === "nova" || slot === "save" }); });
      }
      TIERS.concat([{ s: "save", label: "SAVE" }, { s: "miss", label: "MISS" }]).forEach(function (t) {
        beats.appendChild(btn(t.label, t.s === "miss" ? "quiet" : null, function () { beat(t.s); }));
      });
      var seqBtn = btn("\u25B6 PLAY THE WHOLE SEQUENCE", "quiet", function () {
        var token = running.seq = {};
        var order = ["cold", "warm", "hot", "fire", "nova", "save"], i = 0;
        fxPrep(v, wait).then(function next() {
          if (running.seq !== token || CUR !== "hot") return;
          if (i >= order.length) { running.seq = null; return; }
          var slot = order[i++], at = heatSet(mk, slot);
          var ms = fxPlay(v, slot, at, { big: slot === "nova" || slot === "save" });
          fxLater(next, (ms || 700) + 280);
        });
      });
      seqBtn.classList.add("lab-wide");
      beats.appendChild(seqBtn);
      var body = h("div", null, null, [mk.el, beats]), t = tile(v, { body: body });
      grid.appendChild(t);
      fxObserve(t, v);
    });
    pane.appendChild(grid);
    loadLooks("hot", list.map(function (v) { return v.id; }));
    return {};
  }

  /* ---- Perks ---- */
  function costMock() {
    var row = h("div", "ticket-actions ta-cap lab-cost");
    ["SKIP TEAM", "SKIP ERA", "SKIP YRS"].forEach(function (l) {
      row.appendChild(h("button", "skip-btn presti-spin", { type: "button", tabindex: "-1", "aria-hidden": "true",
        html: '<span class="sk-lab">' + l + '</span><span class="sk-chip">\u2212$1M</span>' }));
    });
    return row;
  }
  // the buttons' own flash (REFUND! in money green, FIRE SALE in fire gold) stays in the game whatever the pack
  function costFlash(row, cls, word) {
    Array.prototype.forEach.call(row.children, function (b) {
      if (!b.__html) b.__html = b.innerHTML;
      b.classList.remove("refunded", "firesale");
      void b.offsetWidth;
      b.classList.add(cls);
      b.textContent = word;
      clearTimeout(b.__t);
      b.__t = setTimeout(function () { b.classList.remove(cls); b.innerHTML = b.__html; }, 2500);
    });
  }
  function panePerk(pane) {
    if (!fxReady()) { fxMissing(pane, "perk packs"); return { stop: function () {} }; }
    var list = LIST.perk || [];
    pane.appendChild(h("h2", "t-head lab-h", { "data-head": "rule" }, "Every pack \u00B7 " + list.length));
    if (list.length < 2) pane.appendChild(h("p", "lab-note", null, "Only today's look so far. New packs land in art/perk."));
    var grid = h("div", "lab-list is-two");
    list.forEach(function (v) {
      var row = costMock(), status = h("p", "lab-status", null, ""), mock = h("div", "lab-mock", null, [row, status]);
      function go(slot) {
        fxPrep(v, function (on) { status.textContent = on ? "Printing the inks\u2026" : ""; }).then(function () {
          costFlash(row, slot === "refund" ? "refunded" : "firesale", slot === "refund" ? "REFUND!" : "FIRE SALE");
          fxPlay(v, slot, row);
        });
      }
      var acts = h("div", "lab-row", null, [btn("REFUND", "good", function () { go("refund"); }), btn("FIRE SALE", null, function () { go("sale"); })]);
      var t = tile(v, { body: h("div", null, null, [mock, acts]) });
      grid.appendChild(t);
      fxObserve(t, v);
    });
    pane.appendChild(grid);
    loadLooks("perk", list.map(function (v) { return v.id; }));
    return {};
  }

  /* ---- 82-0: the perfect print, then the fireworks ---- */
  function panePerfect(pane) {
    var api = paneScenes(pane, true);
    var fw = h("div", null);
    pane.appendChild(fw);
    fw.appendChild(h("h2", "t-head lab-h", { "data-head": "rule" }, "The fireworks"));
    if (!fxReady()) { fxMissing(fw, "fireworks packs"); return api; }
    var list = LIST.goat || [];
    if (list.length < 2) fw.appendChild(h("p", "lab-note", null, "Only today's look so far. New packs land in art/goat."));
    var grid = h("div", "lab-list is-two");
    list.forEach(function (v) {
      var cap = h("div", "lab-wl-cap", null, "A perfect season");
      var wl = h("div", "lab-mock lab-wl", null, [h("div", "lab-wl-rec", null, "82\u20130"), cap]);
      function wait(on) { cap.textContent = on ? "Printing the inks\u2026" : "A perfect season"; }
      function burst() { return fxPlay(v, "burst", wl, { big: true, box: wl }); }
      var acts = h("div", "lab-row", null, [
        btn("ONE BURST", null, function () { fxPrep(v, wait).then(burst); }),
        btn("THE VOLLEY", "quiet", function () {
          fxPrep(v, wait).then(function () { for (var b = 0; b < 9; b++) fxLater(burst, b * 180); });   // fireGoats: nine bursts, 180 ms apart
        })]);
      var t = tile(v, { body: h("div", null, null, [wl, acts]) });
      grid.appendChild(t);
      fxObserve(t, v);
    });
    fw.appendChild(grid);
    loadLooks("goat", list.map(function (v) { return v.id; }));
    return api;
  }

  /* ---------------- tabs ---------------- */
  var PANES = {};
  function tabCount() {
    TABS.forEach(function (t) {
      var b = $("tab-" + t.key);
      if (!b) return;
      var n;
      if (t.key === "picture") n = (LIST.scene || []).filter(function (v) { return !v.perfect; }).length;
      else if (t.key === "perfect") n = (LIST.scene || []).filter(function (v) { return v.perfect; }).length + (LIST.goat || []).length;
      else n = (LIST[t.kinds[0]] || []).length;
      b.querySelector("small").textContent = n + (n === 1 ? " LOOK" : " LOOKS");
    });
  }
  function buildTabs() {
    var nav = $("labTabs");
    TABS.forEach(function (t) {
      var b = h("button", "lab-tab", { type: "button", role: "tab", id: "tab-" + t.key, "aria-selected": "false", "aria-controls": "pane-" + t.key },
        [t.label, h("small", null, null, "\u00A0")]);
      b.addEventListener("click", function () { openTab(t.key, true); });
      nav.appendChild(b);
      var p = h("section", "lab-pane", { id: "pane-" + t.key, role: "tabpanel", "aria-labelledby": "tab-" + t.key });
      p.hidden = true;
      $("labMain").appendChild(p);
      PANES[t.key] = p;
    });
  }
  function nextTabBtn(i) {
    if (i >= TABS.length - 1) return h("p", "lab-note", null, "That's everything. Tap SEE THE CODE below when you're done.");
    var t = TABS[i + 1];
    return btn("NEXT: " + t.label.toUpperCase() + " \u2192", "quiet", function () { openTab(t.key, true); win.scrollTo(0, 0); });
  }
  var READY = false;
  function openTab(key, user) {
    var idx = -1;
    TABS.forEach(function (t, i) { if (t.key === key) idx = i; });
    if (idx < 0) { key = "loss"; idx = 0; }
    if (CUR !== key) stopAll();
    CUR = key;
    UI.tab = key; saveUI();
    try { if (user && win.history && history.replaceState) history.replaceState(null, "", "#" + key); } catch (e) { /* cosmetic */ }
    TABS.forEach(function (t) {
      $("tab-" + t.key).setAttribute("aria-selected", t.key === key ? "true" : "false");
      PANES[t.key].hidden = t.key !== key;
    });
    if (!READY) return;
    var pane = PANES[key], t = TABS[idx];
    if (!BUILT[key]) {
      pane.innerHTML = "";
      pane.appendChild(h("p", "lab-intro", null, t.intro));
      var api = key === "loss" ? paneLoss(pane) : key === "dots" ? paneDots(pane) : key === "picture" ? paneScenes(pane, false)
        : key === "perfect" ? panePerfect(pane) : key === "hot" ? paneHot(pane) : panePerk(pane);
      pane.appendChild(h("p", "lab-note lab-foot-note", null, LIVE_HOST.test(location.hostname || "")
        ? "TRY IT links only work on test builds: true82.net ignores them."
        : TABS[idx].key === "hot" || TABS[idx].key === "perk" ? "TRY opens the real game with that look forced and the moment set up for you: start a Presti run. Test builds only, never true82.net."
        : "TRY IT opens the real game with that look forced" + (TABS[idx].key === "perfect" ? " and the season set to 82-0" : "") + ". It works on test builds like this one, never on true82.net."));
      pane.appendChild(h("div", "lab-next", null, nextTabBtn(idx)));
      BUILT[key] = api || {};
    } else if (BUILT[key].reopen) BUILT[key].reopen();
    if (BUILT[key].refresh) BUILT[key].refresh();
    pump();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    $("labStamp").textContent = "Tonight's art \u00B7 " + today();
    buildTabs();
    paintBar();
    $("labOpenPicks").addEventListener("click", openSheet);
    $("labBackdrop").addEventListener("click", closeSheet);
    $("labClose").addEventListener("click", closeSheet);
    $("labCopy").addEventListener("click", copyCode);
    $("labClear").addEventListener("click", function () {
      if (!Object.keys(PICKS).length && !Object.keys(NOTES).length) { toast("Nothing to clear."); return; }
      if (!win.confirm("Clear every heart, X and note?")) return;
      Object.keys(PICKS).forEach(function (k) { delete PICKS[k]; });
      writeJSON(K_PICKS, PICKS);
      Object.keys(NOTES).forEach(function (k) { delete NOTES[k]; });
      writeJSON(K_NOTES, NOTES);
      Array.prototype.forEach.call(doc.querySelectorAll(".lab-notebox"), function (b) { b.parentNode.removeChild(b); });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-nk]"), function (b) { b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-expanded", "false"); });
      Array.prototype.forEach.call(doc.querySelectorAll(".lab-tile"), function (t) { t.classList.remove("is-noted"); });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-mk]"), function (b) { b.setAttribute("aria-pressed", "false"); });
      Array.prototype.forEach.call(doc.querySelectorAll(".lab-tile"), function (t) { t.classList.remove("is-love", "is-cut"); });
      paintBar();
      $("labCode").textContent = picksCode();
      if (BUILT.loss && BUILT.loss.refresh) BUILT.loss.refresh();
    });
    doc.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeSheet(); });
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) stopAll(); else pump(); });
    var hash = (location.hash || "").replace("#", ""), first = TABS.some(function (t) { return t.key === hash; }) ? hash : UI.tab || "loss";
    openTab(first, false);
    PANES[CUR].appendChild(h("p", "lab-note", null, "Warming up the presses\u2026"));
    Promise.all([gameKeys(), loadLedger()]).then(function (r) { return loadEngines(r[0]); }).then(function () {
      KINDS.forEach(buildList);
      READY = true;
      tabCount();
      PANES[CUR].innerHTML = "";
      openTab(CUR, false);
      // which scenes are perfect is in their files: read them all once things settle, so the tab counts are right
      setTimeout(function () { loadScenes().then(tabCount); }, 1800);
    });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();

  // for Claude and the QA scripts: decode a pasted code, read what is on the page
  win.T82LAB = { code: picksCode, picks: function () { return JSON.parse(JSON.stringify(PICKS)); }, notes: function () { return JSON.parse(JSON.stringify(NOTES)); }, list: function (k) { return LIST[k] || []; },
    open: function (k) { openTab(k, true); }, version: LAB_V };
})();

/* ---------- TRUE 82 Reprint Lab: the console ----------
   Owns the recipe, the controls, the preview bed, favorites, compare and the
   recipe code. Everything the owner can toggle lives in CONTROLS. */
(function () {
  "use strict";
  var LAB = window.LAB, R = window.RISO;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    for (k in (attrs || {})) { if (k === "text") n.textContent = attrs[k]; else if (k === "html") n.innerHTML = attrs[k]; else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 1800); }

  /* ---- recipe state ---- */
  // First visit opens on the look the judges rated best; "Today, printed" stays first in the list as the baseline.
  function openingPreset() { var list = LAB.presets || [], pick = list.filter(function (p) { return p.id === LAB.OPENING_PRESET; })[0]; return pick || list[0]; }
  LAB.OPENING_PRESET = LAB.OPENING_PRESET || "evolution-night-shift";
  var rc = LAB.recipe(store("t82lab-rc") || (openingPreset() ? openingPreset().rc : {}));
  var view = store("t82lab-view") || "masthead", stateIx = {};
  var DEVICES = { phone: [390, 780], tablet: [768, 1000], desktop: [1280, 800] }, device = store("t82lab-device") || "phone";
  function dev() { return DEVICES[device] || DEVICES.phone; }
  var todayOn = false;
  function logoBanner() {
    var url = window.LAB_LOGO || "http://localhost:8788/logo.png";
    return Promise.resolve({ url: url, w: 800, h: 188, cssW: 232, headBg: "" });
  }
  function set(patch, why) {
    var k; for (k in patch) rc[k] = patch[k];
    rc = LAB.recipe(rc);
    store("t82lab-rc", rc);
    sync(); schedule(why);
  }

  /* ---- recipe code ---- */
  function encode(r) {
    var d = {}, k; for (k in r) if (JSON.stringify(r[k]) !== JSON.stringify(LAB.DEFAULT[k])) d[k] = r[k];
    var s = JSON.stringify(d);
    return "T82-" + btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(code) {
    var s = String(code || "").trim().replace(/^T82-/, "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  }
  LAB.encode = encode; LAB.decode = decode;

  /* ---- controls ---- */
  function opts(list) { return list.map(function (o) { return Array.isArray(o) ? { v: o[0], t: o[1] } : { v: o, t: o }; }); }
  function registryOpts(kind, extra) {
    return (extra || []).concat(LAB.order[kind].map(function (id) { var d = LAB[kind][id]; return { v: id, t: d.name, g: d.group, d: d.blurb || d.note }; }));
  }
  var CONTROLS = [
    { id: "presets", title: "Presets", hint: "complete looks, ready to judge", open: true, rows: [{ type: "presets" }] },
    { id: "ink", title: "Ink", hint: "the drum set: palette and paper", open: true, rows: [
      { type: "swatches", key: "palette" },
      { type: "select", key: "stock", label: "Paper", options: function () { return [{ v: "auto", t: "The palette's own" }].concat(Object.keys(R.STOCKS).map(function (k) { return { v: k, t: R.STOCKS[k].name + (R.STOCKS[k].dark ? " (dark)" : "") }; })); } },
      { type: "seg", key: "darkMode", label: "Ink on dark", options: opts([["auto", "Palette's"], ["normal", "Opaque"], ["screen", "Glow"]]) }
    ] },
    { id: "site", title: "Site system", hint: "every button, card and chip on every page", open: true, rows: [
      { type: "seg", key: "sysPalette", label: "Colors", options: function () { return [{ v: "match", t: "Match palette" }, { v: "today", t: "Today's site" }]; } },
      { type: "seg", key: "ground", label: "Ground", options: function () { return opts(LAB.SYS.ground); } },
      { type: "seg", key: "btn", label: "Buttons", options: function () { return opts(LAB.SYS.btn); } },
      { type: "seg", key: "card", label: "Cards", options: function () { return opts(LAB.SYS.card); } },
      { type: "seg", key: "slips", label: "Results tiles", options: function () { return opts(LAB.SYS.slips || [["paper", "Paper"]]); } },
      { type: "seg", key: "chip", label: "Chips", options: function () { return opts(LAB.SYS.chip); } },
      { type: "seg", key: "corners", label: "Corners", options: function () { return opts(LAB.SYS.corners); } },
      { type: "seg", key: "texture", label: "Texture", options: function () { return opts(LAB.SYS.texture); } },
      { type: "select", key: "disp", label: "Display type", options: function () { return [{ v: "match", t: "Match the wordmark" }].concat((LAB.displayFonts ? LAB.displayFonts() : LAB.fontList()).map(function (f) { return { v: f.id, t: f.name, g: f.group, d: f.note }; })); } },
      { type: "select", key: "body", label: "Body type", options: function () { return opts(LAB.SYS.body); } },
      { type: "select", key: "mono", label: "Data type", options: function () { return opts(LAB.SYS.mono); } }
    ] },
    { id: "word", title: "Wordmark", hint: "type, depth, shape", open: true, rows: [
      { type: "select", key: "font", label: "Face", options: function () { return registryOpts("fonts"); } },
      { type: "select", key: "font82", label: "82 face", options: function () { return [{ v: "match", t: "Same face" }].concat(registryOpts("fonts")); } },
      { type: "seg", key: "ink82", label: "82 ink", options: opts([["word", "Same"], ["a", "Offset ink"], ["b", "Icon ink"], ["outline", "Outline"]]) },
      { type: "seg", key: "depth", label: "Depth", options: function () { return opts(LAB.OPTIONS.depth); } },
      { type: "slider", key: "depthDist", label: "Depth", min: 0, max: 1, step: 0.05, fmt: function (v) { return Math.round(v * 100) + "%"; } },
      { type: "slider", key: "depthAng", label: "Angle", min: 0, max: 355, step: 5, fmt: function (v) { return v + "°"; } },
      { type: "seg", key: "wordTex", label: "Surface", options: function () { return opts(LAB.OPTIONS.wordTex); } },
      { type: "seg", key: "shape", label: "Shape", options: function () { return opts(LAB.OPTIONS.shape); } },
      { type: "seg", key: "lines", label: "Lines", options: opts([["one", "One line"], ["two", "TRUE over 82"]]) },
      { type: "slider", key: "track", label: "Tracking", min: -0.06, max: 0.3, step: 0.01, fmt: function (v) { return (v * 1000 | 0) / 1000 + "em"; } }
    ] },
    { id: "icon", title: "Icon", hint: "what the mark is, and how it's drawn", open: true, rows: [
      { type: "thumbs", key: "concept" },
      { type: "seg", key: "iconStyle", label: "Drawn as", options: opts([["print", "Halftone print"], ["flat", "Flat ink"], ["line", "Line art"], ["stamp", "Rubber stamp"], ["sticker", "Die-cut sticker"], ["woodcut", "Line screen"], ["neon", "Neon"]]) },
      { type: "seg", key: "iconDepth", label: "Icon depth", options: function () { return opts(LAB.OPTIONS.iconDepth); } },
      { type: "slider", key: "iconScale", label: "Icon size", min: 0.6, max: 1.25, step: 0.05, fmt: function (v) { return Math.round(v * 100) + "%"; } }
    ] },
    { id: "layout", title: "Layout & extras", hint: "arrangement, backdrop, ornaments", open: false, rows: [
      { type: "seg", key: "layout", label: "Layout", options: function () { return registryOpts("layouts"); } },
      { type: "seg", key: "backdrop", label: "Backdrop", options: function () { return [{ v: "none", t: "None" }].concat(LAB.order.additions.filter(function (id) { return id.indexOf("bd-") === 0; }).map(function (id) { return { v: id.slice(3), t: LAB.additions[id].name }; })); } },
      { type: "toggles", key: "adds", label: "Add", options: function () { return LAB.order.additions.filter(function (id) { return id.indexOf("bd-") !== 0; }).map(function (id) { return { v: id, t: LAB.additions[id].name }; }); } },
      { type: "select", key: "tagline", label: "Tagline", options: opts(["THE 82-0 CHASE", "CAN YOU GO 82-0?", "NBA DRAFT GAME", "DRAFT FIVE. RUN THE TABLE.", "BUILT FOR THE 82-0 CHASE", "EST. IN THE PRINT SHOP"]) }
    ] },
    { id: "press", title: "Press", hint: "how the drum lays the ink down", open: false, rows: [
      { type: "slider", key: "reg", label: "Misregister", min: 0, max: 6, step: 0.1, fmt: function (v) { return v.toFixed(1) + "px"; } },
      { type: "slider", key: "regDir", label: "Direction", min: 0, max: 355, step: 5, fmt: function (v) { return v + "°"; } },
      { type: "slider", key: "pitch", label: "Dot size", min: 1.4, max: 5, step: 0.1, fmt: function (v) { return v.toFixed(1); } },
      { type: "slider", key: "grain", label: "Grain", min: 0, max: 2.5, step: 0.1, fmt: function (v) { return v.toFixed(1); } },
      { type: "slider", key: "starve", label: "Starvation", min: 0, max: 3, step: 0.1, fmt: function (v) { return v.toFixed(1); } },
      { type: "slider", key: "tooth", label: "Paper tooth", min: 0, max: 2, step: 0.1, fmt: function (v) { return v.toFixed(1); } },
      { type: "seg", key: "screen", label: "Screen", options: opts([["dot", "Dots"], ["line", "Lines"]]) },
      { type: "reroll" }
    ] },
    { id: "motion", title: "Motion", hint: "how the masthead arrives", open: false, rows: [
      { type: "seg", key: "motion", label: "Motion", options: opts([["none", "Still"], ["print", "Prints in"], ["breathe", "Breathes"], ["boil", "Boils"]]) },
      { type: "replay" }
    ] },
    { id: "keep", title: "Keep", hint: "favorites, compare, send it to Claude", open: true, rows: [{ type: "keep" }] }
  ];

  var binders = [];
  function buildConsole() {
    var host = $("#console"); host.innerHTML = "";
    CONTROLS.forEach(function (grp) {
      var body = el("div", { class: "gbody" });
      var d = el("details", { class: "group", id: "g-" + grp.id }, [el("summary", {}, [el("h2", { text: grp.title }), el("span", { class: "hint", text: grp.hint })]), body]);
      var saved = store("t82lab-open-" + grp.id); if (saved === null ? grp.open : saved) d.open = true;
      d.addEventListener("toggle", function () { store("t82lab-open-" + grp.id, d.open); });
      grp.rows.forEach(function (row) { body.appendChild(buildRow(row)); });
      host.appendChild(d);
    });
    sync();
  }
  function list(row) { return typeof row.options === "function" ? row.options() : row.options || []; }
  function buildRow(row) {
    var id = "c-" + (row.key || row.type);
    if (row.type === "seg") {
      var seg = el("div", { class: "seg", role: "group", "aria-label": row.label });
      list(row).forEach(function (o) {
        var b = el("button", { type: "button", "data-v": o.v, title: o.d || "", onclick: function () { var p = {}; p[row.key] = isNaN(+o.v) || o.v === "" ? o.v : o.v; set(p, row.key); } }, [o.t]);
        seg.appendChild(b);
      });
      binders.push(function () { seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(String(rc[row.key]) === b.getAttribute("data-v"))); }); });
      return el("div", { class: "row" }, [el("span", { class: "lbl", text: row.label }), seg]);
    }
    if (row.type === "select") {
      var s = el("select", { id: id, onchange: function () { var p = {}; p[row.key] = s.value; set(p, row.key); } }), groups = {};
      list(row).forEach(function (o) {
        var op = el("option", { value: o.v }, [o.t + (o.d ? "  ·  " + o.d : "")]);
        if (o.g) { if (!groups[o.g]) { groups[o.g] = el("optgroup", { label: o.g }); s.appendChild(groups[o.g]); } groups[o.g].appendChild(op); } else s.appendChild(op);
      });
      binders.push(function () { s.value = rc[row.key]; });
      return el("div", { class: "row" }, [el("label", { class: "lbl", for: id, text: row.label }), s]);
    }
    if (row.type === "slider") {
      var inp = el("input", { type: "range", id: id, min: row.min, max: row.max, step: row.step }), out = el("output", { for: id });
      inp.addEventListener("input", function () { var p = {}; p[row.key] = +inp.value; out.textContent = row.fmt(+inp.value); set(p, row.key); });
      binders.push(function () { inp.value = rc[row.key]; out.textContent = row.fmt(+rc[row.key]); });
      return el("div", { class: "slider" }, [el("label", { for: id, text: row.label }), inp, out]);
    }
    if (row.type === "toggles") {
      var tg = el("div", { class: "seg", role: "group", "aria-label": row.label });
      list(row).forEach(function (o) {
        tg.appendChild(el("button", { type: "button", "data-v": o.v, onclick: function () { var a = rc.adds.slice(), i = a.indexOf(o.v); if (i >= 0) a.splice(i, 1); else a.push(o.v); set({ adds: a }, "adds"); } }, [o.t]));
      });
      binders.push(function () { tg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(rc.adds.indexOf(b.getAttribute("data-v")) >= 0)); }); });
      return el("div", { class: "row" }, [el("span", { class: "lbl", text: row.label }), tg]);
    }
    if (row.type === "swatches") {
      var wrap = el("div", {}), groups2 = {};
      LAB.order.palettes.forEach(function (pid) {
        var p = LAB.palettes[pid], g = p.group || "Palettes";
        if (!groups2[g]) { groups2[g] = el("div", { class: "swatches" }); wrap.appendChild(el("p", { class: "sw-group", text: g })); wrap.appendChild(groups2[g]); }
        var st = R.STOCKS[p.stock] || R.STOCKS.cream, dots = el("span", { class: "dots" }, [el("i", { style: "background:" + st.paper })]);
        ["key", "a", "b", "c", "d"].forEach(function (s2) { if (p.inks[s2]) dots.appendChild(el("i", { style: "background:" + R.rgbHex(R.inkRGB(p.inks[s2])) })); });
        groups2[g].appendChild(el("button", { type: "button", class: "sw", "data-v": pid, title: p.blurb || "", onclick: function () { set({ palette: pid }, "palette"); } }, [dots, el("b", { text: p.name }), el("small", { text: p.blurb || "" })]));
      });
      binders.push(function () { wrap.querySelectorAll(".sw").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === rc.palette)); }); });
      return wrap;
    }
    if (row.type === "thumbs") {
      var th = el("div", { class: "thumbs" });
      [{ id: "none", name: "No icon" }].concat(LAB.order.concepts.map(function (c) { return LAB.concepts[c]; })).forEach(function (c) {
        var cvs = el("canvas", { width: 10, height: 10 }), b = el("button", { type: "button", class: "thumb", "data-v": c.id, title: c.blurb || "", onclick: function () { set({ concept: c.id }, "concept"); } }, [cvs, el("span", { text: c.name })]);
        th.appendChild(b); b._cv = cvs;
      });
      binders.push(function () { th.querySelectorAll(".thumb").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === rc.concept)); }); });
      thumbHosts.push(th);
      return th;
    }
    if (row.type === "presets") {
      var pr = el("div", { class: "presets" }), note = el("p", { class: "note" });
      (LAB.presets || []).forEach(function (p, i) {
        var img = el("img", { alt: "" }), b = el("button", { type: "button", class: "ticket", "data-i": i, onclick: function () { rc = LAB.recipe(p.rc); store("t82lab-rc", rc); sync(); schedule("preset"); note.textContent = p.note || ""; } }, [img, el("b", { text: p.name }), el("span", { text: p.line || "" })]);
        pr.appendChild(b); presetImgs.push({ img: img, rc: p.rc });
      });
      binders.push(function () { var code = JSON.stringify(rc); pr.querySelectorAll(".ticket").forEach(function (b) { var p = LAB.presets[+b.getAttribute("data-i")]; b.setAttribute("aria-pressed", String(JSON.stringify(LAB.recipe(p.rc)) === code)); }); });
      return el("div", { class: "gbody" }, [pr, note]);
    }
    if (row.type === "reroll") {
      return el("div", { class: "btns" }, [el("button", { type: "button", class: "btn", onclick: function () { set({ seed: 1 + Math.floor(Math.random() * 9999) }, "seed"); } }, ["Re-ink (new press run)"])]);
    }
    if (row.type === "replay") {
      return el("div", { class: "btns" }, [el("button", { type: "button", class: "btn", onclick: function () { if (bigCtl) bigCtl.replay(); } }, ["Replay"])]);
    }
    if (row.type === "keep") return buildKeep();
    return el("div");
  }
  function sync() { binders.forEach(function (f) { f(); }); }

  /* ---- favorites, compare, code ---- */
  var favs = store("t82lab-favs") || [], compareOn = false;
  function buildKeep() {
    var wrap = el("div", { class: "gbody" }), grid = el("div", { class: "thumbs" }), code = el("div", { class: "code", id: "code" }), paste = el("input", { type: "text", id: "paste", placeholder: "Paste a T82- code to load it" });
    function draw() {
      grid.innerHTML = "";
      favs.forEach(function (f, i) {
        var b = el("button", { type: "button", class: "thumb", title: "Load " + f.name, onclick: function () { rc = LAB.recipe(f.rc); store("t82lab-rc", rc); sync(); schedule("fav"); } }, [el("img", { src: f.thumb || "", alt: "" }), el("span", { text: f.name })]);
        var x = el("button", { type: "button", class: "btn", style: "padding:2px 6px;font-size:10px;box-shadow:none", onclick: function (e) { e.stopPropagation(); favs.splice(i, 1); store("t82lab-favs", favs); draw(); } }, ["Remove"]);
        grid.appendChild(el("div", { style: "display:grid;gap:4px" }, [b, x]));
      });
      if (!favs.length) grid.appendChild(el("p", { class: "foot", text: "Starred looks land here. Star up to 12." }));
    }
    draw();
    binders.push(function () { code.textContent = encode(rc); });
    wrap.appendChild(el("div", { class: "btns" }, [
      el("button", { type: "button", class: "btn primary", onclick: function () {
        if (favs.length >= 12) { toast("Twelve is the limit. Remove one first."); return; }
        LAB.image(rc, 360, 1).then(function (im) { favs.push({ name: "Look " + (favs.length + 1), rc: JSON.parse(JSON.stringify(rc)), thumb: im.canvas.toDataURL("image/jpeg", 0.7) }); store("t82lab-favs", favs); draw(); toast("Starred"); });
      } }, ["★ Star this look"]),
      el("button", { type: "button", class: "btn", id: "cmpBtn", "aria-pressed": "false", onclick: function () { compareOn = !compareOn; this.setAttribute("aria-pressed", String(compareOn)); this.textContent = compareOn ? "Stop comparing" : "Compare stars"; schedule("compare"); } }, ["Compare stars"]),
      el("button", { type: "button", class: "btn", onclick: function () { shuffle(); } }, ["Shuffle"]),
      el("button", { type: "button", class: "btn", onclick: function () { rc = LAB.recipe(openingPreset() ? openingPreset().rc : {}); store("t82lab-rc", rc); sync(); schedule("reset"); } }, ["Reset"])
    ]));
    wrap.appendChild(grid);
    wrap.appendChild(el("p", { class: "foot", text: "Your code. Send it to Claude and it builds exactly this:" }));
    wrap.appendChild(code);
    wrap.appendChild(el("div", { class: "btns" }, [
      el("button", { type: "button", class: "btn", onclick: function () { var t = encode(rc); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast("Code copied"); }, function () { selectCode(); }); else selectCode(); } }, ["Copy code"]),
      el("button", { type: "button", class: "btn", onclick: function () { var t = favs.map(function (f) { return f.name + ": " + encode(f.rc); }).join("\n"); if (!t) { toast("No stars yet"); return; } var box = $("#code"); box.textContent = t; if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast("All star codes copied"); }, function () { selectCode(); }); else selectCode(); } }, ["Copy all star codes"])
    ]));
    paste.addEventListener("change", function () { try { rc = LAB.recipe(decode(paste.value)); store("t82lab-rc", rc); sync(); schedule("paste"); toast("Loaded"); paste.value = ""; } catch (e) { toast("That code didn't read. Copy it again, whole."); } });
    wrap.appendChild(paste);
    return wrap;
  }
  function selectCode() { var c = $("#code"), r = document.createRange(); r.selectNodeContents(c); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Selected; copy it"); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle() {
    var fonts = LAB.order.fonts.filter(function (f) { return f !== "plexmono"; });
    set({
      palette: pick(LAB.order.palettes), concept: pick(LAB.order.concepts), font: pick(fonts), font82: Math.random() < 0.25 ? pick(fonts) : "match",
      depth: pick(["offset", "block", "extrude", "fade", "shadow", "echo", "split"]), depthAng: pick([20, 35, 45, 135, 315]), depthDist: 0.3 + Math.random() * 0.5,
      iconStyle: pick(["print", "print", "flat", "stamp", "sticker", "line"]), layout: pick(["inline", "inline", "iconfirst", "stacked", "ticket", "marquee", "badge"]),
      backdrop: pick(["none", "none", "sun", "rays", "stripes", "sky"]), adds: ["star"].concat(Math.random() < 0.4 ? ["marks"] : [], Math.random() < 0.3 ? ["pips"] : []),
      wordTex: pick(["solid", "solid", "solid", "ramp", "lines"]), btn: pick(LAB.SYS.btn)[0], card: pick(LAB.SYS.card)[0], chip: pick(LAB.SYS.chip)[0], ground: pick(["night", "day"]), seed: 1 + Math.floor(Math.random() * 999)
    }, "shuffle");
  }

  /* ---- the bed ---- */
  var thumbHosts = [], presetImgs = [], bigCtl = null, tRender = 0, lastBanner = null, currentDoc = null, mounting = null;
  function schedule(why) { clearTimeout(tRender); tRender = setTimeout(function () { render(why); }, why === "load" ? 0 : 90); }
  function views() { return LAB.VIEWS || [{ id: "masthead", name: "Masthead", states: [] }]; }
  function buildViews() {
    var nav = $("#views"); nav.innerHTML = "";
    views().forEach(function (v) {
      nav.appendChild(el("button", { type: "button", role: "tab", "data-v": v.id, "aria-selected": String(v.id === view), onclick: function () { view = v.id; store("t82lab-view", view); buildViews(); buildStates(); schedule("view"); } }, [v.name]));
    });
    buildStates();
  }
  function curView() { return views().filter(function (v) { return v.id === view; })[0] || views()[0]; }
  function buildStates() {
    var v = curView(), host = $("#states"); host.innerHTML = "";
    (v.states || []).forEach(function (s, i) {
      host.appendChild(el("button", { type: "button", "aria-pressed": String((stateIx[v.id] || 0) === i), onclick: function () { stateIx[v.id] = i; buildStates(); schedule("state"); } }, [s.name]));
    });
    host.appendChild(el("button", { type: "button", class: "today", "aria-pressed": String(todayOn), title: "Flip this screen to the live site as it is today", onclick: function () { todayOn = !todayOn; buildStates(); schedule("today"); } }, [todayOn ? "Showing today's site" : "Compare with today"]));
    if ((v.states || []).length) {
      var dv = el("span", { class: "device" });
      [["phone", "Phone"], ["tablet", "Tablet"], ["desktop", "Desktop"]].forEach(function (d) {
        dv.appendChild(el("button", { type: "button", "aria-pressed": String(device === d[0]), onclick: function () { device = d[0]; store("t82lab-device", device); buildStates(); var st = $("#stage"); st.removeAttribute("data-snap"); schedule("device"); } }, [d[1]]));
      });
      host.appendChild(dv);
    }
    $("#caption").textContent = v.caption || "";
  }
  function stageW() { return Math.max(260, $("#stage").clientWidth - 20); }
  function headerBanner(r) {
    // the masthead as the site header shows it: 232 css px wide at 2x, on the ground color
    // Today's site keeps its own flat night header: print the plate without paper tooth so no box shows around it.
    var rp = r.sysPalette === "today" ? Object.assign({}, r, { tooth: 0 }) : r;
    return LAB.image(rp, 300, 2).then(function (im) {
      var roles = LAB.roles(LAB.palettes[r.sysPalette && r.sysPalette !== "match" && r.sysPalette !== "today" ? r.sysPalette : r.palette], r.ground);
      im.cssW = Math.min(290, Math.round(100 * im.w / im.h));   // sized by height (100px) with a width cap, like a real header
      im.headBg = r.sysPalette === "today" ? "" : roles.ground;
      return im;
    });
  }
  function render(why) {
    var v = curView(), stage = $("#stage");
    if (bigCtl) { bigCtl.destroy(); bigCtl = null; }
    if (compareOn) { renderCompare(v); return; }
    if (v.id === "masthead") { renderMast(); renderThumbs(why); return; }
    var st = (v.states || [])[stateIx[v.id] || 0];
    if (!st) return;
    var needMount = !currentDoc || stage.getAttribute("data-snap") !== st.snap || !stage.querySelector("iframe");
    var rcView = todayOn ? LAB.recipe(Object.assign({}, rc, { sysPalette: "today", slips: "paper" })) : rc;
    (todayOn ? logoBanner() : headerBanner(rc)).then(function (banner) {
      lastBanner = banner;
      if (needMount) {
        stage.innerHTML = ""; stage.setAttribute("data-snap", st.snap);
        var D = dev(), wrap = el("div", { class: "phone-wrap" }), ph = el("div", { class: "phone" + (device !== "phone" ? " wide" : ""), style: "width:" + D[0] + "px;height:" + D[1] + "px" }), fr = el("iframe", { title: v.name + ": " + st.name, loading: "eager", style: "width:" + D[0] + "px;height:" + D[1] + "px" });
        ph.appendChild(fr); wrap.appendChild(ph); stage.appendChild(wrap); fitPhone();
        currentDoc = null;
        mounting = LAB.pages.mount(fr, st.snap, rcView, banner, st.y).then(function (doc) { currentDoc = doc; });
      } else if (currentDoc) LAB.pages.apply(currentDoc, rcView, banner);
    });
    renderThumbs(why);
  }
  function fitPhone() {
    var wrap = $("#stage .phone-wrap"), ph = $("#stage .phone"); if (!ph) return;
    var D = dev(), avail = stageW(), maxH = window.innerWidth >= 980 ? window.innerHeight - 200 : Math.min(window.innerHeight * 0.74, D[1]);
    var s = Math.min(1, avail / D[0], maxH / D[1]);
    ph.style.transform = "scale(" + s + ")"; wrap.style.width = Math.round(D[0] * s) + "px"; wrap.style.height = Math.round(D[1] * s) + "px";
  }
  window.addEventListener("resize", function () { fitPhone(); });
  function renderMast() {
    var stage = $("#stage"); currentDoc = null; stage.removeAttribute("data-snap");
    stage.innerHTML = "";
    if (todayOn) {
      logoBanner().then(function (b) {
        stage.appendChild(el("div", { class: "mast" }, [el("figure", {}, [el("div", { class: "head", style: "background:#101418;border-color:#6E5530;width:420px" }, [el("img", { src: b.url, alt: "Today's logo", style: "width:300px" })]), el("figcaption", { text: "The masthead today" })])]));
      });
      return;
    }
    var big = el("canvas", { class: "big", role: "img", "aria-label": "The masthead, printed" });
    var roles = LAB.roles(LAB.palettes[rc.sysPalette && rc.sysPalette !== "match" && rc.sysPalette !== "today" ? rc.sysPalette : rc.palette], rc.ground);
    // "In the site header" is a crop of the real homepage header, themed exactly like the pages
    var HS = Math.min(0.86, (stageW() - 20) / 390), hf = el("iframe", { title: "The site header", style: "width:390px;height:780px;border:0;display:block;transform:scale(" + HS + ");transform-origin:0 0" });
    var head = el("div", { class: "headclip", style: "width:" + Math.round(390 * HS) + "px;height:" + Math.round(150 * HS) + "px;overflow:hidden;position:relative;border-radius:4px" }, [hf]);
    var fav = el("canvas", { class: "fav" }), og = el("canvas", { class: "og" });
    stage.appendChild(el("div", { class: "mast" }, [big,
      el("div", { class: "row" }, [
        el("figure", {}, [head, el("figcaption", { text: "In the site header" })]),
        el("figure", {}, [fav, el("figcaption", { text: "App icon" })]),
        el("figure", {}, [og, el("figcaption", { text: "Link card" })])
      ])]));
    var w = Math.min(860, stageW());
    bigCtl = LAB.mount(big, rc, { cssW: w, dpr: Math.min(2, window.devicePixelRatio || 1) });
    headerBanner(rc).then(function (b) {
      return LAB.pages.mount(hf, "home-intro", rc, b).then(function (doc) {
        try { var sh = doc && doc.querySelector && doc.querySelector(".site-head"); if (sh) head.style.height = Math.round((sh.getBoundingClientRect().bottom + 6) * HS) + "px"; } catch (e) {}
      });
    });
    var mk = Object.assign({}, rc, { layout: "mark", adds: rc.adds.filter(function (a) { return a === "star" || a === "sparkle"; }), motion: "none" });
    if (rc.concept === "none") mk.concept = "hoop-star";
    LAB.image(mk, 64, 3).then(function (im) { fav.width = im.w; fav.height = im.h; fav.getContext("2d").drawImage(im.canvas, 0, 0); });
    LAB.image(Object.assign({}, rc, { motion: "none" }), 900, 1).then(function (im) {
      og.width = 1200; og.height = 630; var x = og.getContext("2d"), st = R.STOCKS[rc.stock === "auto" ? (LAB.palettes[rc.palette].stock || "cream") : rc.stock] || R.STOCKS.cream;
      x.fillStyle = im.paper || st.paper; x.fillRect(0, 0, 1200, 630);
      var s = Math.min(1080 / im.w, 520 / im.h); x.drawImage(im.canvas, (1200 - im.w * s) / 2, (630 - im.h * s) / 2, im.w * s, im.h * s);
    });
  }
  function renderCompare(v) {
    var stage = $("#stage"); currentDoc = null; stage.removeAttribute("data-snap"); stage.innerHTML = "";
    var list = favs.length ? favs : [{ name: "Current", rc: rc }];
    var grid = el("div", { class: "compare" }); stage.appendChild(grid);
    list.slice(0, 6).forEach(function (f) {
      var fig = el("figure"), r = LAB.recipe(f.rc);
      grid.appendChild(fig);
      if (v.id === "masthead") {
        var c = el("canvas", { style: "width:100%;height:auto" }); fig.appendChild(c); fig.appendChild(el("figcaption", { text: f.name }));
        LAB.image(r, 420, 2).then(function (im) { c.width = im.w; c.height = im.h; c.getContext("2d").drawImage(im.canvas, 0, 0); });
        return;
      }
      var st = (v.states || [])[stateIx[v.id] || 0]; if (!st) return;
      var s = Math.min(0.5, (stageW() / Math.min(list.length, 3) - 12) / 390);
      var ph = el("div", { class: "phone", style: "transform:scale(" + s + ")" }), fr = el("iframe", { title: f.name }), wrap = el("div", { class: "phone-wrap", style: "width:" + Math.round(390 * s) + "px;height:" + Math.round(780 * s) + "px" });
      ph.appendChild(fr); wrap.appendChild(ph); fig.appendChild(wrap); fig.appendChild(el("figcaption", { text: f.name }));
      headerBanner(r).then(function (b) { LAB.pages.mount(fr, st.snap, r, b, st.y); });
    });
  }
  // concept thumbnails and preset tickets re-ink in the current palette
  var thumbKey = "";
  function renderThumbs(why) {
    var key = rc.palette + rc.iconStyle + rc.stock + rc.darkMode + rc.pitch;
    if (key === thumbKey && why !== "load") return;
    thumbKey = key;
    var chain = Promise.resolve();
    thumbHosts.forEach(function (th) {
      th.querySelectorAll(".thumb").forEach(function (b) {
        var id = b.getAttribute("data-v"); if (id === "none") return;
        chain = chain.then(function () {
          return LAB.image({ palette: rc.palette, stock: rc.stock, darkMode: rc.darkMode, concept: id, layout: "mark", iconStyle: rc.iconStyle, adds: [], depth: "offset", iconDepth: "none", reg: rc.reg, pitch: 1.8 }, 96, 1)
            .then(function (im) { b._cv.width = im.w; b._cv.height = im.h; b._cv.getContext("2d").drawImage(im.canvas, 0, 0); });
        });
      });
    });
    if (why === "load") {
      var groups = {}, order = [];                         // one print per look, shared by the rail and the list
      presetImgs.forEach(function (p) { var k = JSON.stringify(p.rc); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(p); });
      var pchain = Promise.resolve();                      // looks first, independent of the icon thumbnails
      order.forEach(function (k) { pchain = pchain.then(function () { return LAB.image(groups[k][0].rc, 300, 1).then(function (im) { var u = im.canvas.toDataURL("image/jpeg", 0.8); groups[k].forEach(function (p) { p.img.src = u; p.img.style.background = im.paper || ""; }); }); }); });
    }
  }

  /* ---- boot ---- */
  // The looks rail: every preset as a small ticket above the screen tabs, so a phone can switch looks without scrolling.
  function buildRail() {
    var host = $("#rail"); if (!host) return;
    host.innerHTML = "";
    (LAB.presets || []).forEach(function (p) {
      var img = el("img", { alt: "" }), b = el("button", { type: "button", class: "rail-item", "data-id": p.id, title: p.line || "", onclick: function () {
        rc = LAB.recipe(p.rc); store("t82lab-rc", rc); sync(); schedule("preset");
        var n = $("#g-presets .note"); if (n) n.textContent = p.note || "";
        toast(p.name);
      } }, [img, el("span", { text: p.name })]);
      host.appendChild(b); presetImgs.push({ img: img, rc: p.rc });
    });
    binders.push(function () { var code = JSON.stringify(rc); host.querySelectorAll(".rail-item").forEach(function (b) { var p = (LAB.presets || []).filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]; b.setAttribute("aria-pressed", String(!!p && JSON.stringify(LAB.recipe(p.rc)) === code)); }); });
  }
  LAB.boot = function () {
    buildRail(); buildConsole(); buildViews();
    $("#jump").addEventListener("click", function () {
      var c = $("#console"), top = c.getBoundingClientRect().top;
      if (top > 40) c.scrollIntoView({ behavior: "smooth" }); else $("#bed").scrollIntoView({ behavior: "smooth" });
    });
    schedule("load");
    setTimeout(function () { var r = $("#rail"), a = r && r.querySelector('.rail-item[aria-pressed="true"]'); if (a) r.scrollLeft = Math.max(0, a.offsetLeft - r.offsetLeft - 8); }, 50);
  };
})();

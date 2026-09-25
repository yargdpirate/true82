/* ---------- TRUE 82 LAB: the tokenizer ----------
   Rewrites every color literal in the site's CSS as a role variable with the
   literal as its fallback, so the page is pixel-identical until a theme sets
   the roles:
     #FFB52E               -> var(--t-accent, #FFB52E)
     rgba(255,181,46,.3)   -> color-mix(in srgb, var(--t-accent, rgb(255,181,46)) 30%, transparent)
   Role lookup, most specific first: the audit entry for this source line,
   then the same selector + property + value, then the value's usual role,
   then a heuristic. Role "fixed" keeps the literal.
   Works in node (build-css.js) and in the browser (tokenize.html). */
(function (root) {
  "use strict";
  var COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)/g;

  function norm(v) {
    v = String(v).trim().toLowerCase().replace(/\s+/g, "");
    if (/^#[0-9a-f]{3,4}$/.test(v)) v = "#" + v.slice(1).split("").map(function (c) { return c + c; }).join("");
    var m = v.match(/^rgba?\(([\d.]+),([\d.]+),([\d.]+)(?:[,/]([\d.]+%?))?\)$/);
    if (m) {
      var a = m[4] == null ? 1 : m[4].indexOf("%") > 0 ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      var hex = "#" + [m[1], m[2], m[3]].map(function (x) { return ("0" + Math.round(+x).toString(16)).slice(-2); }).join("");
      return a >= 1 ? hex : hex + "@" + (+a.toFixed(3));
    }
    if (/^#[0-9a-f]{8}$/.test(v)) { var al = parseInt(v.slice(7), 16) / 255; return al >= 1 ? v.slice(0, 7) : v.slice(0, 7) + "@" + (+al.toFixed(3)); }
    return v;
  }
  function baseHex(n) { return n.split("@")[0]; }
  function alphaOf(n) { var p = n.split("@"); return p[1] == null ? 1 : +p[1]; }
  function rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function normSel(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  // Audit entries describe props and selectors in prose ("background (linear-gradient)",
  // "svg stroke attr", "ensureTraitsCss injected <style ...>: .tchip"); reduce them to CSS.
  function normProp(p) {
    p = String(p || "").trim().toLowerCase();
    var m = p.match(/^custom property (--[a-z0-9-]+)/); if (m) return m[1];
    m = p.match(/^svg (fill|stroke|stop-color)\b/); if (m) return m[1];
    m = p.match(/^(fill|stroke) \(svg\)/); if (m) return m[1];
    if (/^filter\b/.test(p)) return "filter";
    return p.replace(/\s*\(.*$/, "").replace(/\s.*$/, "");
  }
  function normEntrySel(s) {
    s = String(s || "");
    var m = s.match(/injected <style[^>]*>:\s*([\s\S]*)$/); if (m) s = m[1];
    return normSel(s);
  }
  function splitSels(s) { return normSel(s).split(/\s*,\s*/); }

  // Build lookup indexes from audit entries. Earlier entries win (role-fixes.json is prepended).
  function Index(entries) {
    var byLine = {}, bySPV = {}, anyVP = {}, byVP = {}, byVal = {}, byHex = {}, routes = {};
    function count(o, k, role) { var c = o[k] = o[k] || {}; c[role] = (c[role] || 0) + 1; if (c._first == null) c._first = role; }
    entries.forEach(function (e) {
      if (!e || !e.value || !e.role) return;
      // var routing: { sel: "*", prop: "color", value: "var(--ink)", role: "accent-ink" } sends every use of a
      // site variable in that property to a role, keeping the variable as the fallback (site vars that do double duty)
      var rv = String(e.value).match(/^var\((--[a-zA-Z0-9_-]+)\)$/);
      if (rv) { (routes[rv[1]] = routes[rv[1]] || []).push({ sels: normSel(e.sel) === "*" ? null : splitSels(e.sel), prop: String(e.prop || "").trim().toLowerCase(), role: e.role }); return; }
      var n = norm(String(e.value).replace(/^%23/, "#")), src = String(e.src || "").replace(/^.*\//, "");
      var kl = src + ":" + e.line;
      (byLine[kl] = byLine[kl] || []).push({ n: n, role: e.role });
      var props = [String(e.prop || "").trim(), normProp(e.prop)];
      splitSels(e.sel).concat(splitSels(normEntrySel(e.sel))).forEach(function (s) {
        props.forEach(function (p) { var k = s + "|" + p + "|" + n; if (!(k in bySPV)) bySPV[k] = e.role; });
      });
      if (normSel(e.sel) === "*") { var ka = n + "|" + normProp(e.prop); if (!(ka in anyVP)) anyVP[ka] = e.role; if (!e.prop && !(n in anyVP)) anyVP[n] = e.role; return; }
      count(byVP, n + "|" + normProp(e.prop), e.role);
      count(byVal, n, e.role);
      count(byHex, baseHex(n), e.role);
    });
    // Most common role; "fixed" only when nothing else uses the value (fixed is always about one place).
    function top(o) { var best = null, bn = -Infinity, k; for (k in o) { if (k === "_first") continue; var v = o[k] + (k === o._first ? 0.5 : 0); if (k === "fixed") v -= 1000; if (v > bn) { best = k; bn = v; } } return best; }
    this.route = function (name, ctx) {
      var list = routes[name]; if (!list || !ctx || !ctx.prop) return null;
      var prop = String(ctx.prop).trim().toLowerCase(), sels = ctx.sel ? splitSels(ctx.sel) : [];
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (!(prop === r.prop || prop.indexOf(r.prop + "-") === 0)) continue;
        if (r.sels && !sels.some(function (s) { return r.sels.indexOf(s) >= 0; })) continue;
        return r.role;
      }
      return null;
    };
    this.role = function (lit, ctx) {
      var n = norm(lit), h = baseHex(n), r;
      if (ctx && ctx.src && ctx.line != null) {
        var list = byLine[ctx.src + ":" + ctx.line];
        // exact value first (a line can hold #232A4E as text and rgba(35,42,78,.28) as its border), then same hex
        if (list) for (var i = 0; i < list.length; i++) if (list[i].n === n) return { role: list[i].role, how: "line" };
        if (list) for (var i2 = 0; i2 < list.length; i2++) if (baseHex(list[i2].n) === h) return { role: list[i2].role, how: "line" };
      }
      var prop = ctx && ctx.prop ? String(ctx.prop).trim().toLowerCase() : "";
      if (ctx && ctx.sel) {
        var sels = splitSels(ctx.sel);
        for (var j = 0; j < sels.length; j++) { r = bySPV[sels[j] + "|" + prop + "|" + n]; if (r) return { role: r, how: "spv" }; }
      }
      // value-level overrides from role-fixes.json (sel "*")
      if (anyVP[n + "|" + prop]) return { role: anyVP[n + "|" + prop], how: "fix" };
      if (anyVP[n]) return { role: anyVP[n], how: "fix" };
      if (prop && byVP[n + "|" + prop]) return { role: top(byVP[n + "|" + prop]), how: "value" };
      if (byVal[n]) return { role: top(byVal[n]), how: "value" };
      if (byHex[h]) return { role: top(byHex[h]), how: "hex" };
      return { role: heuristic(h, alphaOf(n), ctx), how: "guess" };
    };
  }
  function heuristic(h, a, ctx) {
    var c = rgbOf(h), l = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255, max = Math.max.apply(null, c), min = Math.min.apply(null, c), sat = max ? (max - min) / max : 0;
    var p = ctx && ctx.prop || "";
    if (h === "#000000") return "shadow";
    if (h === "#ffffff") return a < 1 ? "light" : "text";
    if (sat < 0.18) { if (l < 0.18) return /shadow/.test(p) ? "shadow" : "ground-2"; if (l > 0.8) return "text"; return "text-2"; }
    var hue = rgbHue(c);
    if (hue >= 30 && hue <= 55) return l > 0.45 ? "accent" : "accent-edge";
    if (hue < 20 || hue > 340) return "bad";
    if (hue > 300) return "offset";
    if (hue > 90 && hue < 170) return "good";
    if (hue >= 190 && hue <= 250) return l < 0.25 ? "ink" : "you";
    return "metal";
  }
  function rgbHue(c) { var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0; if (!d) return 0; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; }

  // One literal -> its tokenized form.
  function tokenOf(lit, role) {
    if (!role || role === "fixed") return lit;
    var n = norm(lit), h = baseHex(n), a = alphaOf(n);
    if (!/^#[0-9a-f]{6}$/.test(h)) return lit;
    var fb = h.toUpperCase();
    if (a >= 1) return "var(--t-" + role + ", " + fb + ")";
    var c = rgbOf(h);
    return "color-mix(in srgb, var(--t-" + role + ", rgb(" + c.join(",") + ")) " + (+(a * 100).toFixed(2)) + "%, transparent)";
  }

  // Replace literals in one declaration value, skipping url(...) and existing var() fallbacks we produced.
  function tokenizeValue(value, index, ctx, stats) {
    var masks = [], v = String(value).replace(/url\((?:[^()"']|"[^"]*"|'[^']*')*\)/gi, function (m) { masks.push(m); return "\u0000" + (masks.length - 1) + "\u0000"; });
    v = v.replace(COLOR_RE, function (lit) {
      var r = index.role(lit, ctx);
      if (stats && stats.all) stats.all.push({ lit: lit, role: r.role, how: r.how, sel: ctx && ctx.sel, prop: ctx && ctx.prop, line: ctx && ctx.line });
      if (stats) { stats.n++; stats[r.how] = (stats[r.how] || 0) + 1; if (r.how === "guess") (stats.guesses = stats.guesses || []).push({ lit: lit, sel: ctx && ctx.sel, prop: ctx && ctx.prop, role: r.role }); }
      return tokenOf(lit, r.role);
    });
    v = routeVars(v, index, ctx, stats);
    return v.replace(/\u0000(\d+)\u0000/g, function (m, i) { return masks[+i]; });
  }
  // var(--site-var) -> var(--t-<role>, var(--site-var)) where a route says so (never inside custom property definitions)
  function routeVars(v, index, ctx, stats) {
    if (!index.route || !ctx || !ctx.prop || String(ctx.prop).indexOf("--") === 0 || v.indexOf("var(--") < 0) return v;
    var out = "", i = 0;
    for (;;) {
      var k = v.indexOf("var(--", i); if (k < 0) { out += v.slice(i); break; }
      var m = v.slice(k + 4).match(/^--[a-zA-Z0-9_-]+/), name = m ? m[0] : "";
      var d = 0, e = k;
      for (; e < v.length; e++) { if (v[e] === "(") d++; else if (v[e] === ")") { d--; if (!d) { e++; break; } } }
      if (d) { out += v.slice(i); break; }
      var whole = v.slice(k, e), role = !name || name.indexOf("--t-") === 0 ? null : index.route(name, ctx);
      out += v.slice(i, k) + (role ? "var(--t-" + role + ", " + whole + ")" : whole);
      if (role && stats) {
        stats.route = (stats.route || 0) + 1;
        if (stats.all) stats.all.push({ lit: "var(" + name + ")", role: role, how: "route", sel: ctx.sel, prop: ctx.prop, line: ctx.line });
      }
      i = e;
    }
    return out;
  }

  /* A small CSS walker: finds every declaration with its selector and source
     line, and rewrites values in place. Comments are kept. */
  function tokenizeCSS(css, index, opts) {
    opts = opts || {};
    var out = "", i = 0, n = css.length, line = 1 + (opts.lineOffset || 0), stack = [], stats = opts.stats || { n: 0 };
    var buf = "", bufLine = line;
    function flushDecls(text, startLine) {
      // text is the inside of a rule block: declarations separated by ; (strings and parens respected)
      var res = "", j = 0, L = startLine, start = 0, depth = 0, q = null;
      function emit(end) {
        var whole = text.slice(start, end), pm = whole.match(/^(?:\s|\/\*[\s\S]*?\*\/)*/), prefix = pm ? pm[0] : "";
        var decl = whole.slice(prefix.length), colon = decl.indexOf(":");
        res += prefix;
        if (colon > 0) {
          var prop = decl.slice(0, colon).trim().toLowerCase();
          var lead = decl.slice(0, colon + 1), val = decl.slice(colon + 1);
          var declLine = L0 + (prefix.match(/\n/g) || []).length;
          // literal lines: compute per literal by walking the value
          var pieces = val.split("\n"), outv = [], ln = declLine + (decl.slice(0, colon).split("\n").length - 1);
          for (var p = 0; p < pieces.length; p++) { outv.push(tokenizeValue(pieces[p], index, { src: opts.src, line: ln + p, sel: stack.length ? stack[stack.length - 1] : "", prop: prop }, stats)); }
          res += lead + outv.join("\n");
        } else res += decl;
      }
      var L0 = L;
      for (j = 0; j < text.length; j++) {
        var ch = text[j];
        if (q) { if (ch === q && text[j - 1] !== "\\") q = null; }
        else if (ch === "\"" || ch === "'") q = ch;
        else if (ch === "/" && text[j + 1] === "*") { var e = text.indexOf("*/", j + 2); if (e < 0) e = text.length - 2; L += (text.slice(j, e + 2).match(/\n/g) || []).length; j = e + 1; continue; }
        else if (ch === "(") depth++;
        else if (ch === ")") depth--;
        else if (ch === ";" && depth === 0) { emit(j); res += ";"; start = j + 1; L0 = L; }
        if (ch === "\n") L++;
      }
      if (start < text.length) emit(text.length);
      return res;
    }
    // walk top level: selectors { ... } and at-rules
    var depthStack = [];
    while (i < n) {
      var c = css[i];
      if (c === "/" && css[i + 1] === "*") { var e2 = css.indexOf("*/", i + 2); if (e2 < 0) e2 = n - 2; var cm = css.slice(i, e2 + 2); out += cm; line += (cm.match(/\n/g) || []).length; i = e2 + 2; continue; }
      if (c === "{") {
        var pre = buf; buf = "";
        var sel = pre.replace(/\/\*[\s\S]*?\*\//g, "").trim();
        out += pre + "{";
        if (/^@(media|supports|container|layer|document)/i.test(sel)) { depthStack.push("group"); line += (pre.match(/\n/g) || []).length; i++; continue; }
        // a rule (or @keyframes / @font-face): capture to the matching close brace
        line += (pre.match(/\n/g) || []).length;
        var startLine = line, d = 1, k2 = i + 1, q2 = null;
        if (/^@keyframes|^@-webkit-keyframes/i.test(sel)) {
          // keyframes: nested blocks; tokenize each frame block
          var kfEnd = k2; d = 1;
          while (kfEnd < n && d > 0) { if (css[kfEnd] === "{") d++; else if (css[kfEnd] === "}") d--; kfEnd++; }
          var body = css.slice(i + 1, kfEnd - 1);
          stack.push(sel);
          out += body.replace(/\{([^{}]*)\}/g, function (m, inner, off) { return "{" + flushDecls(inner, startLine + (body.slice(0, off).match(/\n/g) || []).length) + "}"; }) + "}";
          stack.pop();
          line += (body.match(/\n/g) || []).length; i = kfEnd; continue;
        }
        while (k2 < n && d > 0) {
          var ch2 = css[k2];
          if (q2) { if (ch2 === q2 && css[k2 - 1] !== "\\") q2 = null; }
          else if (ch2 === "\"" || ch2 === "'") q2 = ch2;
          else if (ch2 === "{") d++;
          else if (ch2 === "}") d--;
          k2++;
        }
        var inner2 = css.slice(i + 1, k2 - 1);
        stack.push(sel);
        out += flushDecls(inner2, startLine) + "}";
        stack.pop();
        line += (inner2.match(/\n/g) || []).length;
        i = k2; continue;
      }
      if (c === "}") { out += buf + "}"; line += (buf.match(/\n/g) || []).length; buf = ""; depthStack.pop(); i++; continue; }
      buf += c; i++;
      if (c === "\n" && buf.trim() === "") { out += buf; buf = ""; line++; }
    }
    out += buf;
    return { css: out, stats: stats };
  }

  // Inline style="" attribute text.
  function tokenizeInline(text, index, sel, stats) {
    return String(text).split(";").map(function (decl) {
      var c = decl.indexOf(":"); if (c < 0) return decl;
      var prop = decl.slice(0, c).trim().toLowerCase();
      if (prop.indexOf("--rr-paper") === 0) return decl;
      return decl.slice(0, c + 1) + tokenizeValue(decl.slice(c + 1), index, { sel: sel || "inline", prop: prop }, stats);
    }).join(";");
  }

  var API = { norm: norm, Index: Index, tokenOf: tokenOf, tokenizeValue: tokenizeValue, tokenizeCSS: tokenizeCSS, tokenizeInline: tokenizeInline, COLOR_RE: COLOR_RE, heuristic: heuristic };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.T82TOK = API;
})(typeof window !== "undefined" ? window : this);

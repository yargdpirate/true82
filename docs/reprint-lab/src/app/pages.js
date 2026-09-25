/* ---------- TRUE 82 Reprint Lab: the real pages ----------
   Every screen in the lab is a snapshot of the real site (captured from a
   local copy with its API) re-skinned by the tokenized site CSS. The theme is
   applied by setting --t-* variables and data-* switches on the snapshot's
   <html>; with no theme set, the tokenized CSS falls back to today's exact
   colors. The masthead image replaces the logo in the header.

   Sources:
     built lab: window.LAB_SNAPS = { name: html } (already tokenized, images inlined)
     dev:       fetch("/snaps-tok/<name>.html"), falling back to "/snaps/<name>.html" */
(function () {
  var LAB = window.LAB, PAGES = LAB.pages = {};
  var cache = {};
  PAGES.source = function (name) {
    if (window.LAB_SNAPS && window.LAB_SNAPS[name]) return Promise.resolve(window.LAB_SNAPS[name]);
    if (cache[name]) return cache[name];
    cache[name] = fetch("/snaps/tok/" + name + ".html", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .catch(function () { return fetch("/snaps/" + name + ".html", { cache: "no-store" }).then(function (r) { return r.text(); }); });
    return cache[name];
  };

  // Theme -> the snapshot document.
  PAGES.apply = function (doc, rc, banner) {
    if (doc && doc.baked) { doc.iframe.srcdoc = PAGES.bake(doc.src, rc, banner); return; }
    if (!doc || !doc.documentElement) return;
    var html = doc.documentElement, st = html.style, today = rc.sysPalette === "today";
    // clear previous theme vars
    for (var i = st.length - 1; i >= 0; i--) { var p = st[i]; if (p.indexOf("--t-") === 0 || p === "--disp" || p === "--body" || p === "--mono") st.removeProperty(p); }
    ["data-btn", "data-card", "data-chip", "data-corners", "data-texture", "data-ground"].forEach(function (a) { html.removeAttribute(a); });
    if (!today) {
      var v = LAB.themeVars(rc), k;
      for (k in v) st.setProperty(k, v[k]);
      if (v["--t-disp"]) st.setProperty("--disp", v["--t-disp"]);
      if (v["--t-body"]) st.setProperty("--body", v["--t-body"]);
      if (v["--t-mono"]) st.setProperty("--mono", v["--t-mono"]);
      html.setAttribute("data-btn", rc.btn); html.setAttribute("data-card", rc.card); html.setAttribute("data-chip", rc.chip);
      html.setAttribute("data-corners", rc.corners); html.setAttribute("data-texture", rc.texture); html.setAttribute("data-ground", rc.ground);
      // component layer + fonts
      var comp = doc.getElementById("lab-comp");
      if (!comp) { comp = doc.createElement("style"); comp.id = "lab-comp"; doc.head.appendChild(comp); }
      var css = LAB.componentCSS ? LAB.componentCSS(rc) : "";
      if (comp.textContent !== css) comp.textContent = css;
      var fonts = LAB.themeFontsCSS(rc), fl = doc.getElementById("lab-fonts"), href = fonts.length ? "https://fonts.googleapis.com/css2?family=" + fonts.join("&family=") + "&display=swap" : "";
      if (href) { if (!fl) { fl = doc.createElement("link"); fl.id = "lab-fonts"; fl.rel = "stylesheet"; doc.head.appendChild(fl); } if (fl.getAttribute("href") !== href) fl.setAttribute("href", href); }
      if (LAB.textureURL) { st.setProperty("--t-paper-tex", "url(" + LAB.textureURL(rc) + ")"); }
    } else {
      var c2 = doc.getElementById("lab-comp"); if (c2) c2.textContent = "";
    }
    // results tiles: its own block, last in <head>, in both color modes
    var slips = LAB.slipsCSS ? LAB.slipsCSS(rc) : "", sl = doc.getElementById("lab-slips");
    if (slips) { html.setAttribute("data-slips", rc.slips); if (!sl) { sl = doc.createElement("style"); sl.id = "lab-slips"; } if (sl.textContent !== slips) sl.textContent = slips; doc.head.appendChild(sl); }
    else { html.removeAttribute("data-slips"); if (sl) sl.textContent = ""; }
    (LAB.pageHooks || []).forEach(function (h) { try { h(doc, rc, banner); } catch (e) { console.error("[lab] page hook", e); } });
    // masthead
    if (banner) {
      doc.querySelectorAll("img.brand-logo").forEach(function (img) {
        if (img.getAttribute("data-lab-src") !== banner.url) {
          img.setAttribute("data-lab-src", banner.url); img.src = banner.url;
          img.setAttribute("width", banner.w); img.setAttribute("height", banner.h);
          img.style.width = banner.cssW ? banner.cssW + "px" : ""; img.style.maxWidth = "86%";
        }
      });
      var head = doc.querySelector(".site-head");
      if (head) head.style.background = banner.headBg || "";
    }
  };

  // Fallback for hosts that forbid reaching into the frame: bake the theme into the HTML itself.
  // (No page hooks run in this mode: the riso canvases keep today's inks.)
  PAGES.bake = function (src, rc, banner) {
    var out = src, today = rc.sysPalette === "today";
    if (!today) {
      var v = LAB.themeVars(rc), decl = "", k;
      for (k in v) decl += k + ":" + v[k] + ";";
      if (v["--t-disp"]) decl += "--disp:" + v["--t-disp"] + ";";
      if (v["--t-body"]) decl += "--body:" + v["--t-body"] + ";";
      if (v["--t-mono"]) decl += "--mono:" + v["--t-mono"] + ";";
      if (LAB.textureURL) decl += "--t-paper-tex:url(" + LAB.textureURL(rc) + ");";
      var attrs = ' data-btn="' + rc.btn + '" data-card="' + rc.card + '" data-chip="' + rc.chip + '" data-corners="' + rc.corners + '" data-texture="' + rc.texture + '" data-ground="' + rc.ground + '"';
      out = out.replace(/<html([^>]*)>/i, function (m, a) { return "<html" + a.replace(/\sdata-(btn|card|chip|corners|texture|ground)="[^"]*"/g, "") + attrs + ">"; });
      var fonts = LAB.themeFontsCSS(rc), fl = fonts.length ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + fonts.join("&family=") + '&display=swap">' : "";
      var css = LAB.componentCSS ? LAB.componentCSS(rc) : "";
      out = out.replace(/<\/head>/i, function () { return fl + "<style id=\"lab-vars\">html:root{" + decl + "}</style><style id=\"lab-comp\">" + css + "</style></head>"; });
    }
    var slips = LAB.slipsCSS ? LAB.slipsCSS(rc) : "";
    if (slips) {
      out = out.replace(/<html([^>]*)>/i, function (m, a) { return "<html" + a.replace(/\sdata-slips="[^"]*"/, "") + ' data-slips="' + rc.slips + '">'; });
      out = out.replace(/<\/head>/i, function () { return "<style id=\"lab-slips\">" + slips + "</style></head>"; });
    }
    if (banner) {
      out = out.replace(/<img([^>]*class="brand-logo"[^>]*)>/g, function (m, a) {
        a = a.replace(/\ssrc="[^"]*"/, "").replace(/\swidth="[^"]*"/, "").replace(/\sheight="[^"]*"/, "");
        return '<img' + a + ' src="' + banner.url + '" width="' + banner.w + '" height="' + banner.h + '" style="width:' + (banner.cssW || 232) + 'px;max-width:86%">';
      });
      if (banner.headBg) out = out.replace(/<header class="site-head"/, '<header class="site-head" style="background:' + banner.headBg + '"');
    }
    return out;
  };

  // Build a live iframe document from a snapshot.
  PAGES.mount = function (iframe, name, rc, banner, y) {
    return PAGES.source(name).then(function (src) {
      var dev = !window.LAB_SNAPS;
      if (dev) src = src.replace(/<base href="[^"]*">/, '<base href="http://localhost:8788/">');
      else {
        src = src.replace(/<base href="[^"]*">/, "");
        src = src.replace(/<link data-lab-site>/g, function () { return "<style data-lab-site>" + (window.LAB_SITE_CSS || "") + "</style>"; });
        src = src.replace(/lab-asset:([0-9a-f]{12})/g, function (m, id) { return (window.LAB_ASSETS || {})[id] || ""; });
      }
      return new Promise(function (res) {
        iframe.onload = function () {
          if (iframe._baked) { res({ baked: true, iframe: iframe, src: src }); return; }
          var doc = null;
          try { doc = iframe.contentDocument; if (!doc || !doc.documentElement) doc = null; } catch (e) { doc = null; }
          if (!doc) { iframe._baked = true; iframe.srcdoc = PAGES.bake(src, rc, banner); return; }
          try {
            // early snapshots recorded element scroll one element late in document order: walk up to the real scroller
            doc.querySelectorAll("[data-snap-scroll]").forEach(function (el) {
              var s = el.getAttribute("data-snap-scroll").split(","), n = el, win = doc.defaultView;
              while (n && n !== doc.body) {
                var oy = win.getComputedStyle(n).overflowY;
                if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) break;
                n = n.parentElement;
              }
              if (n && n !== doc.body) { n.scrollLeft = +s[0]; n.scrollTop = +s[1]; }
            });
            // links inside the snapshot go nowhere
            doc.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a"); if (a) e.preventDefault(); }, true);
            doc.querySelectorAll("form").forEach(function (f) { f.addEventListener("submit", function (e) { e.preventDefault(); }); });
          } catch (e) {}
          PAGES.apply(doc, rc, banner);
          if (y) setTimeout(function () { try { doc.defaultView.scrollTo(0, y); } catch (e) {} }, 60);
          res(doc);
        };
        iframe.srcdoc = src;
      });
    });
  };
})();

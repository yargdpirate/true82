/* Dev loader: loads the site's own theme and print engines (tools/theme-core.js,
   results-riso.js, reel-riso.js, from the local site: window.LAB_SITE_BASE, default
   http://localhost:8789/), then the lab sources in order, then every file in the
   registry folders (palettes/, concepts/, system/) found by directory listing.
   Resolves window.LAB_READY when done. The built lab inlines the same files in the
   same order. */
(function () {
  var base = new URL("../", document.currentScript.src).href;
  var SITE_BASE = window.LAB_SITE_BASE || "http://localhost:8789/";
  var SITE = ["tools/theme-core.js", "results-riso.js", "reel-riso.js"];
  var CORE = ["engine.js", "banner.js", "fonts.js", "layouts.js", "additions.js"];
  var DIRS = ["palettes/", "concepts/", "system/"];
  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src + "?t=" + Date.now();
      s.onload = res; s.onerror = function () { console.error("[lab] failed to load " + src); res(); };
      document.head.appendChild(s);
    });
  }
  function list(dir) {
    return fetch(base + dir, { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
      var out = [], re = /href="([^"?#]+\.js)"/g, m;
      while ((m = re.exec(html))) out.push(dir + decodeURIComponent(m[1]));
      return out.sort();
    }).catch(function () { return []; });
  }
  function fontsLink() {
    var fams = window.LAB.fontList().map(function (f) { return f.css; }).filter(Boolean);
    var chunk = 12, waits = [];
    for (var i = 0; i < fams.length; i += chunk) {
      var l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=" + fams.slice(i, i + chunk).join("&family=") + "&display=swap";
      waits.push(new Promise(function (res) { l.onload = res; l.onerror = res; setTimeout(res, 5000); }));
      document.head.appendChild(l);
    }
    return Promise.all(waits);
  }
  window.LAB_READY = SITE.map(function (f) { return SITE_BASE + f; }).concat(CORE.map(function (f) { return base + f; }))
    .reduce(function (p, f) { return p.then(function () { return load(f); }); }, Promise.resolve())
    .then(function () { return Promise.all(DIRS.map(list)); })
    .then(function (lists) { var all = [].concat.apply([], lists); return all.reduce(function (p, f) { return p.then(function () { return load(base + f); }); }, Promise.resolve()); })
    .then(function () { return fontsLink(); }).then(function () { return window.LAB; });
})();

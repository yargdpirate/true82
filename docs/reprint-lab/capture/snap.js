/* Snapshot helper for the TRUE 82 lab.
   Load in a page on http://localhost:8788 with:
     await fetch('http://localhost:8091/snap.js').then(r => r.text()).then(eval)
   then:
     await T82SNAP('03-draft-round1', 'Classic draft, round 1, pool scrolled to top')
   Writes scratchpad/snaps/<name>.html and <name>.json through the lab server.
   Canvases become <img> of their current pixels, scripts are dropped, form
   values and scroll offsets are kept, and a <base> points at the local site. */
window.T82SNAP = async function (name, note) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error("name must be kebab-case: " + name);
  var live = document.documentElement, doc = live.cloneNode(true);
  var lc = live.querySelectorAll("canvas"), cc = doc.querySelectorAll("canvas");
  for (var i = 0; i < lc.length; i++) {
    try {
      var r = lc[i].getBoundingClientRect(), img = document.createElement("img");
      img.src = lc[i].width && lc[i].height ? lc[i].toDataURL("image/png") : "";
      img.className = lc[i].className;
      if (lc[i].id) img.id = lc[i].id;
      img.setAttribute("style", (lc[i].getAttribute("style") || "") + ";width:" + r.width + "px;height:" + r.height + "px");
      img.setAttribute("data-snap-canvas", "1");
      if (lc[i].getAttribute("aria-hidden")) img.setAttribute("aria-hidden", lc[i].getAttribute("aria-hidden"));
      // keep the canvas's data-* (v51: the reel strips carry data-games etc. so the lab can reprint them)
      Array.prototype.forEach.call(lc[i].attributes, function (a) { if (/^data-/.test(a.name)) img.setAttribute(a.name, a.value); });
      img.alt = "";
      cc[i].replaceWith(img);
    } catch (e) { cc[i].setAttribute("data-snap-canvas-failed", String(e && e.message)); }
  }
  var li = live.querySelectorAll("input, textarea, select"), ci = doc.querySelectorAll("input, textarea, select");
  for (i = 0; i < li.length; i++) {
    if (li[i].type === "checkbox" || li[i].type === "radio") { if (li[i].checked) ci[i].setAttribute("checked", ""); else ci[i].removeAttribute("checked"); }
    else if (li[i].tagName === "SELECT") { var o = ci[i].options[li[i].selectedIndex]; if (o) o.setAttribute("selected", ""); }
    else ci[i].setAttribute("value", li[i].value);
  }
  var la = live.querySelectorAll("*"), ca = doc.querySelectorAll("*");
  for (i = 0; i < la.length; i++) {
    if (la[i].scrollTop > 0 || la[i].scrollLeft > 0) ca[i].setAttribute("data-snap-scroll", la[i].scrollLeft + "," + la[i].scrollTop);
  }
  doc.querySelectorAll("script").forEach(function (s) { s.remove(); });
  doc.querySelectorAll("textarea").forEach(function (t) { if (t.getAttribute("value") != null) { t.textContent = t.getAttribute("value"); t.removeAttribute("value"); } });
  var head = doc.querySelector("head"), base = document.createElement("base");
  base.href = location.origin + "/";
  head.insertBefore(base, head.firstChild);
  var meta = {
    name: name, note: note || "", url: location.href, w: innerWidth, h: innerHeight,
    scrollX: scrollX, scrollY: scrollY, htmlClass: live.className, bodyClass: document.body.className,
    title: document.title, canvases: lc.length, bytes: 0
  };
  var html = "<!doctype html>\n" + doc.outerHTML;
  meta.bytes = html.length;
  var a = await fetch("http://localhost:8091/snap/" + name + ".html", { method: "POST", body: html });
  var b = await fetch("http://localhost:8091/snap/" + name + ".json", { method: "POST", body: JSON.stringify(meta, null, 1) });
  return { html: await a.text(), meta: await b.text(), bytes: meta.bytes, canvases: lc.length };
};
"T82SNAP ready";

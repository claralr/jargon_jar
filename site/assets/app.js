/* Jargon Jar · site shell: theme, preloader, HUD, scroll effects, cursor, contact form. */
(function () {
  "use strict";
  var d = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function pad(n, l) { n = String(n); while (n.length < l) n = "0" + n; return n; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Theme toggle ---------- */
  var toggle = $("#themeToggle");
  function isDark() {
    var t = d.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function syncToggle() { if (toggle) toggle.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode"); }
  if (toggle) toggle.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    d.setAttribute("data-theme", next);
    try { localStorage.setItem("jj-theme", next); } catch (e) {}
    syncToggle();
  });
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncToggle); } catch (e) {}
  syncToggle();

  /* ---------- Preloader: real loading, max ~1s, first visit per session ---------- */
  function markReady() {
    d.classList.remove("is-preloading");
    d.classList.add("is-ready");
    try { sessionStorage.setItem("jj-seen", "1"); } catch (e) {}
  }
  if (d.classList.contains("is-preloading")) {
    var pre = $(".preloader"), count = $("[data-pre-count]"), bar = $(".preloader-bar span");
    var target = 35, shown = 0, t0 = performance.now(), finished = false;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { target = Math.max(target, 80); });
    if (document.readyState === "complete") target = 100;
    else window.addEventListener("load", function () { target = 100; });
    var finish = function () {
      if (finished) return; finished = true;
      if (count) count.textContent = "100";
      if (bar) bar.style.transform = "scaleX(1)";
      if (pre) pre.classList.add("is-leaving");
      setTimeout(markReady, 220);
    };
    var tick = function (now) {
      if (finished) return;
      if (now - t0 > 760) target = 100;            // never longer than ~1s in total
      shown += (target - shown) * 0.2 + 0.5;
      if (shown > target) shown = target;
      var v = Math.round(shown);
      if (count) count.textContent = pad(v, 3);
      if (bar) bar.style.transform = "scaleX(" + (v / 100) + ")";
      if (v >= 100) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, 1100);                       // safety net if frames are throttled
  } else {
    d.classList.add("is-ready");
  }

  /* ---------- Header height for sticky offsets ---------- */
  var header = $("#siteHeader");
  function setHeaderH() { if (header) d.style.setProperty("--header-h", header.offsetHeight + "px"); }
  setHeaderH();
  window.addEventListener("resize", setHeaderH);

  /* ---------- HUD: Geneva clock + scroll readout ---------- */
  var clockEl = $('[data-hud="clock"]');
  if (clockEl) {
    var fmt = null;
    try { fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); } catch (e) {}
    var drawClock = function () { if (fmt) clockEl.textContent = fmt.format(new Date()); };
    drawClock();
    setInterval(drawClock, 1000);
  }
  var scrollEl = $('[data-hud="scroll"]');

  /* ---------- HUD: total visits from Umami ----------
     Fill in shareId to turn it on: Umami > Websites > Edit > Share URL > enable,
     then copy the last part of the share link (…/share/THIS-PART/…).
     If the ID is missing or the request fails, the item stays hidden. */
  var UMAMI = {
    shareId: "T0gHhHNxna1OC9cZ",
    // Umami Cloud has served its share API from more than one path; try each in turn.
    apis: ["https://cloud.umami.is/api", "https://cloud.umami.is/analytics/eu/api", "https://cloud.umami.is/analytics/us/api"]
  };
  var visitsBox = $("[data-hud-visits]"), visitsEl = $('[data-hud="visits"]');
  function showVisits(n) {
    if (!visitsBox || !visitsEl || !(n >= 0)) return;
    visitsEl.textContent = Number(n).toLocaleString("en-GB");
    visitsBox.hidden = false;
  }
  function num(v) { return v && typeof v === "object" ? v.value : v; }
  if (visitsBox && UMAMI.shareId && UMAMI.shareId.indexOf("YOUR-") !== 0 && window.fetch) {
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem("jj-visits") || "null"); } catch (e) {}
    if (cached && Date.now() - cached.t < 600000) showVisits(cached.n);
    else {
      var getStats = function (api) {
        return fetch(api + "/share/" + encodeURIComponent(UMAMI.shareId))
          .then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then(function (sh) {
            return fetch(api + "/websites/" + sh.websiteId + "/stats?startAt=0&endAt=" + Date.now(),
              { headers: { "x-umami-share-token": sh.token } });
          })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); });
      };
      UMAMI.apis.reduce(function (p, api) { return p.catch(function () { return getStats(api); }); }, Promise.reject())
        .then(function (st) {
          var n = num(st.visits);
          if (!(n >= 0)) n = num(st.pageviews);
          showVisits(n);
          try { sessionStorage.setItem("jj-visits", JSON.stringify({ n: n, t: Date.now() })); } catch (e) {}
        })
        .catch(function () {});
    }
  }

  /* ---------- Scroll-linked effects (one rAF loop) ---------- */
  var timeline = $(".timeline"), tlFill = $(".timeline-line span");
  var cards = $$(".stack-card");
  var ticking = false;
  function onFrame() {
    ticking = false;
    var vh = window.innerHeight;
    if (scrollEl) {
      var max = document.documentElement.scrollHeight - vh;
      scrollEl.textContent = pad(Math.round(max > 0 ? clamp(window.scrollY / max, 0, 1) * 100 : 0), 3);
    }
    if (timeline && tlFill) {
      if (reduce) tlFill.style.transform = "scaleY(1)";
      else {
        var r = timeline.getBoundingClientRect();
        tlFill.style.transform = "scaleY(" + clamp((vh * 0.65 - r.top) / r.height, 0, 1).toFixed(4) + ")";
      }
    }
    if (!reduce && cards.length > 1) {
      for (var i = 0; i < cards.length - 1; i++) {
        var a = cards[i].getBoundingClientRect(), b = cards[i + 1].getBoundingClientRect();
        var p = clamp(1 - (b.top - a.top) / a.height, 0, 1);
        var inner = cards[i].firstElementChild;
        inner.style.transform = "scale(" + (1 - p * 0.06).toFixed(4) + ")";
        inner.style.opacity = (1 - p * 0.35).toFixed(3);
      }
    }
  }
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  onFrame();

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$("[data-reveal]");
  if (!("IntersectionObserver" in window)) reveals.forEach(function (el) { el.classList.add("in"); });
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }
  window.JJReveal = function (root) { $$("[data-reveal]", root).forEach(function (el) { el.classList.add("in"); }); };

  /* ---------- Custom cursor: desktop pointer only ---------- */
  if (!reduce && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var dot = document.createElement("div");
    dot.className = "cursor";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    var x = -100, y = -100, tx = -100, ty = -100, s = 1, ts = 1, op = 0, running = false;
    var loop = function () {
      x += (tx - x) * 0.3; y += (ty - y) * 0.3; s += (ts - s) * 0.2;
      dot.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")";
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(ts - s) > 0.1) requestAnimationFrame(loop);
      else running = false;
    };
    var kick = function () { if (!running) { running = true; requestAnimationFrame(loop); } };
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!d.classList.contains("has-cursor")) { d.classList.add("has-cursor"); x = tx; y = ty; }
      var t = e.target;
      var field = t.closest && t.closest("input:not([type=radio]), textarea, select");
      var hot = t.closest && t.closest("a, button, label, .chip, .option, [role=button]");
      ts = hot ? 3.4 : 1;
      op = field ? 0 : (hot ? 0.28 : 1);
      dot.style.opacity = String(op);
      kick();
    }, { passive: true });
    document.addEventListener("mouseleave", function () { dot.style.opacity = "0"; });
    document.addEventListener("mousedown", function () { ts = ts * 0.8; kick(); });
  }

  /* Contact form logic lives in contact.js. */
})();

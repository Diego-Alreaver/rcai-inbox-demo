/*!
 * RCAI demo-engine.js — data-driven engine for the bilingual hero chat-window
 * demos. Reads window.DEMO_CONFIG, builds the whole stage from the active
 * locale, plays the SLOW play-once timeline, runs the honest finale SCENES
 * (order / booking), then STOPS and makes the thread scrollable. Handles the
 * ES|EN toggle + ?lang= + prefers-reduced-motion (static full end frame).
 *
 * Companion: demo-kit.css (all styles) + chat-kit.js (window.RCAI_ICON).
 * Public API: window.RCAIDemo.boot()  — variants set DEMO_CONFIG then call it.
 *
 * OWNERSHIP SPLIT (so the 4 other channel variants match 1:1):
 *   • DEMO_CONFIG.locales = per-business CONTENT only (stage copy, thread[],
 *     and the data blocks order / bookingService / post).
 *   • This engine OWNS every RCAI/platform-standard string (presence, composer
 *     placeholder, date separator, the CTA-button label, all order-dashboard
 *     labels and the entire booking page) as es/en dictionaries below.
 *
 * Plain classic script. No build step, no modules.
 */
(function (global) {
  "use strict";

  /* ---- Pacing constants (HARD numbers — lean slow, DESIGN_DOC §5). -------- */
  var FIRST = 700, TYPING = 1800, AFTER_TYPING = 350, READ_GAP = 3000,
      BEAT_HOLD = 1200, PRE_SCENE = 2600;

  /* ---- Engine-owned RCAI / platform strings (es/en). --------------------- */
  var CHROME = {
    whatsapp:  { online:{es:"en línea",en:"online"}, offline:{es:"desconectado",en:"offline"}, typing:{es:"escribiendo…",en:"typing…"}, today:{es:"HOY",en:"TODAY"} },
    messenger: { online:{es:"Activo(a) ahora",en:"Active now"}, offline:{es:"Desconectado",en:"Offline"}, typing:{es:"escribiendo…",en:"typing…"}, today:{es:"HOY 10:18",en:"TODAY 10:18"} },
    facebook:  { online:{es:"Activo(a) ahora",en:"Active now"}, offline:{es:"Desconectado",en:"Offline"}, typing:{es:"escribiendo…",en:"typing…"}, today:{es:"HOY 10:18",en:"TODAY 10:18"} },
    instagram: { online:{es:"Activo(a) ahora",en:"Active now"}, offline:{es:"Desconectado",en:"Offline"}, typing:{es:"escribiendo…",en:"typing…"}, today:{es:"HOY",en:"TODAY"} },
    widget:    { online:{es:"En línea",en:"Online"}, offline:{es:"Desconectado",en:"Offline"}, typing:{es:"escribiendo…",en:"typing…"}, today:null }
  };
  var ENC = { es:"Los mensajes están cifrados de extremo a extremo.", en:"Messages are end-to-end encrypted." };
  var CTA_LABEL = { es:"Agendar cita", en:"Book appointment" };
  var POWERED = { es:"Con tecnología de", en:"Powered by" };

  var ORDER_T = {
    title:   { es:"Pedidos", en:"Orders" },
    orderNo: { es:"Pedido", en:"Order" },
    confirmed:{ es:"Confirmada", en:"Confirmed" },
    customer:{ es:"Cliente", en:"Customer" },
    checkout:{ es:"Respuestas de checkout", en:"Checkout answers" },
    products:{ es:"Productos", en:"Products" },
    colProduct:{ es:"Producto", en:"Product" },
    colQty:  { es:"Cant.", en:"Qty" },
    colNote: { es:"Nota", en:"Note" },
    fromChat:{ es:"Creada desde el chat", en:"Created from chat" }
  };
  var BOOK_T = {
    step1:   { es:"Elegir hora", en:"Choose Time" },
    step2:   { es:"Confirmar", en:"Confirm" },
    title:   { es:"Elige fecha y hora", en:"Choose Date & Time" },
    subtitle:{ es:"Selecciona tu fecha y horario preferido", en:"Choose your preferred date and time slot" },
    selectDate:{ es:"Elige una fecha", en:"Select New Date" },
    month:   { es:"Junio 2026", en:"June 2026" },
    times:   { es:"Horarios disponibles", en:"Available Times" },
    timesEmpty:{ es:"Selecciona una fecha para ver los horarios disponibles", en:"Please select a date to view available time slots" },
    continue:{ es:"Continuar", en:"Continue" },
    confirmedTitle:{ es:"¡Cita confirmada!", en:"Appointment confirmed!" },
    rights:  { es:"© 2026 ReadyChatAI. Todos los derechos reservados.", en:"© 2026 ReadyChatAI. All rights reserved." },
    privacy: { es:"Privacidad", en:"Privacy Policy" },
    terms:   { es:"Términos", en:"Terms & Conditions" },
    dow:     { es:["Do","Lu","Ma","Mi","Ju","Vi","Sá"], en:["Su","Mo","Tu","We","Th","Fr","Sa"] },
    slots:   { es:["9:00 a. m.","10:00 a. m.","11:30 a. m.","3:00 p. m."], en:["9:00 AM","10:00 AM","11:30 AM","3:00 PM"] }
  };
  var WEEKDAY = {
    es:["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],
    en:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
  };

  /* ---- Engine state. ----------------------------------------------------- */
  var cfg, lang, mode, platform, surface, reduce;
  var stageEl, feedEl, threadEl, phoneEl, headlineEl, presenceNode, typingNode = null;
  var timers = [];

  /* ---- Small helpers. ---------------------------------------------------- */
  function tr(v) { // resolve string | {es,en}
    if (v == null) return "";
    if (typeof v === "object" && (("es" in v) || ("en" in v))) return v[lang] != null ? v[lang] : (v.es != null ? v.es : v.en);
    return v;
  }
  function attr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }
  function ic(name, size, opt) {
    if (typeof global.RCAI_ICON !== "function") return "";
    var o = { size: size };
    if (opt) { if (opt.stroke != null) o.stroke = opt.stroke; if (opt.color != null) o.color = opt.color; }
    return global.RCAI_ICON(name, o);
  }
  function icon(name, size, opt) { return '<span class="ic">' + ic(name, size, opt) + "</span>"; }
  function after(ms, fn) { timers.push(setTimeout(fn, ms)); }       // absolute from start
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }       // relative from call
  function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }
  function isSent(from) { return from === "customer" || from === "visitor"; }
  function locale() { return (cfg.locales && cfg.locales[lang]) || {}; }
  function chrome() { return CHROME[platform] || CHROME.whatsapp; }
  function reveal(node) { requestAnimationFrame(function () { requestAnimationFrame(function () { node && node.classList.add("shown"); }); }); }

  var BOLT = '<span class="ic bolt"><svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="#f5a623" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg></span>';

  /* ======================================================================
   * STAGE BUILD.
   * ==================================================================== */
  function getLang() {
    var q = "es";
    try { var p = new URLSearchParams(global.location.search).get("lang"); if (p) q = String(p).toLowerCase(); } catch (e) {}
    if (q !== "es" && q !== "en") q = "es";
    if (cfg.locales && !cfg.locales[q]) q = cfg.locales.es ? "es" : "en";
    return q;
  }

  function brandMark() {
    if (platform === "whatsapp") return '<span class="wa-badge">' + ic("wa-logo", 18, { color: "#fff" }) + "</span>";
    if (platform === "messenger") return '<span class="brand-mark">' + ic("messenger-logo", 22) + "</span>";
    if (platform === "facebook") return '<span class="brand-mark">' + ic("facebook-logo", 22) + "</span>";
    if (platform === "instagram") return '<span class="brand-mark">' + ic("ig-logo", 22) + "</span>";
    return '<span class="brand-mark">' + ic("message-square", 20, { color: "#0fae96" }) + "</span>";
  }

  function langToggle() {
    return '<div class="lang-toggle">' +
      '<button type="button" class="lang-pill' + (lang === "es" ? " active" : "") + '" data-lang="es">ES</button>' +
      '<button type="button" class="lang-pill' + (lang === "en" ? " active" : "") + '" data-lang="en">EN</button>' +
      "</div>";
  }

  function headlineBlock() {
    var s = locale().stage || {};
    var ticks = (s.ticks || []).map(function (t) {
      return '<div class="tick"><span class="ic tick-ic">' + ic("check", 19, { stroke: 2.6 }) + "</span> " + tr(t) + "</div>";
    }).join("");
    if (mode === "mobile") {
      return '<div class="mobile-topbar">' +
        '<span class="eyebrow">' + BOLT + brandMark() + " " + tr(s.eyebrow) + "</span>" +
        langToggle() +
      "</div>";
    }
    return '<div class="headline" id="headline">' +
      langToggle() +
      '<span class="eyebrow">' + BOLT + brandMark() + " " + tr(s.eyebrow) + "</span>" +
      "<h1>" + tr(s.h1) + '<br><span class="accent">' + tr(s.h1accent) + "</span></h1>" +
      "<p>" + tr(s.sub) + "</p>" +
      '<div class="ticks">' + ticks + "</div>" +
    "</div>";
  }

  function statusBar() {
    return '<div class="statusbar"><span class="sb-time">9:41</span><span class="sb-icons">' +
      icon("signal", 17, { stroke: 2.4 }) + icon("wifi", 17, { stroke: 2.4 }) + icon("battery", 21, { stroke: 2.2 }) +
      "</span></div>";
  }

  function presenceText(typing) {
    var c = chrome();
    if (typing) return tr(c.typing);
    var b = cfg.business || {};
    return b.online === false ? tr(c.offline) : tr(c.online);
  }

  function headerActions() {
    if (platform === "whatsapp")
      return '<span class="hdr-actions">' + icon("wa-video", 23) + icon("wa-call", 21) + icon("more-v", 20) + "</span>";
    // messenger / facebook
    return '<span class="hdr-actions">' + icon("phone", 22) + icon("video", 24) + icon("info", 23) + "</span>";
  }

  function header() {
    var b = cfg.business || {};
    if (platform === "instagram") {
      return '<div class="ig-topbar">' +
        '<span class="ic back">' + ic("chevron-left", 26, { stroke: 2.2 }) + "</span>" +
        '<span class="ig-mini-name">' + (b.handle || b.name || "") + "</span>" +
        '<span class="hdr-actions">' + icon("phone", 22) + icon("video", 24) + "</span>" +
      "</div>";
    }
    var dot = (platform === "messenger" || platform === "facebook") && b.online !== false ? '<span class="dot"></span>' : "";
    return '<div class="chat-header">' +
      '<span class="ic back">' + ic("chevron-left", 26, { stroke: 2.3 }) + "</span>" +
      '<div class="hdr-avatar"><img src="' + attr(b.avatar) + '" alt="' + attr(b.name) + '" decoding="async"/>' + dot + "</div>" +
      '<div class="hdr-id"><div class="hdr-name">' + (b.name || "") + "</div>" +
        '<div class="hdr-sub" id="presence">' + presenceText(false) + "</div></div>" +
      headerActions() +
    "</div>";
  }

  function composer() {
    if (platform === "whatsapp") {
      return '<div class="composer">' +
        '<div class="cbar"><span class="ic">' + ic("wa-emoji", 22) + '</span><span class="ph">' + (lang === "es" ? "Mensaje" : "Message") + "</span>" +
          '<span class="cicons">' + icon("wa-attach", 21) + icon("wa-camera", 21) + "</span></div>" +
        '<div class="csend"><span class="ic">' + ic("wa-send", 22, { color: "#fff" }) + "</span></div>" +
      "</div>";
    }
    if (platform === "instagram") {
      return '<div class="composer">' +
        '<div class="cam">' + icon("camera", 22, { color: "#fff" }) + "</div>" +
        '<div class="cbar"><span class="ph">' + (lang === "es" ? "Mensaje…" : "Message…") + "</span>" +
          '<span class="cicons">' + icon("mic", 21) + icon("image", 21) + icon("ig-heart", 21) + "</span></div>" +
      "</div>";
    }
    // messenger / facebook
    return '<div class="composer">' +
      '<span class="ic cic">' + ic("plus", 25, { stroke: 2.3 }) + "</span>" +
      '<span class="ic cic">' + ic("camera", 23) + "</span>" +
      '<span class="ic cic">' + ic("image", 22) + "</span>" +
      '<span class="ic cic">' + ic("mic", 22) + "</span>" +
      '<div class="cbar"><span class="ph">Aa</span><span class="ic emoji">' + ic("emoji", 21) + "</span></div>" +
      '<span class="ic like">' + ic("ig-heart", 24) + "</span>" +
    "</div>";
  }

  function phoneSurface() {
    return '<div id="phone"><div class="screen">' +
      '<div class="island"></div>' + statusBar() + header() +
      '<div class="thread" id="thread"><div class="feed" id="feed"></div></div>' +
      composer() +
    "</div></div>";
  }

  function siteImage() {
    var s = cfg.siteImage;
    if (!s) return "";
    return tr(s);
  }

  function widgetSurface() {
    var b = cfg.business || {};
    var url = b.site || (b.handle ? String(b.handle).replace(/^@/, "") + ".com" : "site.com");
    return '<div id="browser">' +
      '<div class="bz-bar"><div class="bz-dots"><span></span><span></span><span></span></div>' +
        '<div class="bz-url">' + ic("lock", 14) + " " + url + "</div></div>" +
      '<div class="bz-page" id="bzpage"><img class="bz-site" src="' + attr(siteImage()) + '" alt=""/></div>' +
      '<div class="widget-launcher" id="launcher">' + ic("message-square", 28, { color: "#fff" }) + "</div>" +
      '<div class="widget-panel" id="wpanel">' +
        '<div class="wp-header"><div class="wp-av"><img src="' + attr(b.avatar) + '" alt=""/></div>' +
          '<div><div class="wp-name">' + (b.name || "") + '</div><div class="wp-status" id="presence">' + presenceText(false) + "</div></div>" +
          '<span class="ic wp-close">' + ic("x", 22) + "</span></div>" +
        '<div class="thread" id="thread"><div class="feed" id="feed"></div></div>' +
        '<div class="wp-footer">' + tr(POWERED) + " <b>ReadyChatAI</b></div>" +
      "</div>" +
    "</div>";
  }

  function buildStage() {
    var stage = document.createElement("div");
    stage.id = "rcai-stage";
    stage.setAttribute("data-mode", mode);
    stage.setAttribute("data-platform", platform);
    stage.setAttribute("aria-label", "ReadyChatAI " + (cfg.id || "") + " demo");
    stage.innerHTML =
      '<div class="orb orb-1"></div><div class="orb orb-2"></div>' +
      headlineBlock() +
      (surface === "widget" ? widgetSurface() : phoneSurface());
    document.body.appendChild(stage);

    stageEl = stage;
    feedEl = stage.querySelector("#feed");
    threadEl = stage.querySelector("#thread");
    phoneEl = stage.querySelector("#phone");
    headlineEl = stage.querySelector("#headline");
    presenceNode = stage.querySelector("#presence");

    // ES|EN toggle: full teardown + rebuild in the chosen locale (no stale DOM).
    var pills = stage.querySelectorAll(".lang-pill");
    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener("click", function () {
        var want = this.getAttribute("data-lang");
        if (want === lang) return;
        lang = want;
        teardown();
        buildStage();
        run();
      });
    }

    if (platform === "whatsapp") paintWallpaper(stage);
  }

  function teardown() {
    clearTimers();
    typingNode = null;
    if (stageEl && stageEl.parentNode) stageEl.parentNode.removeChild(stageEl);
    stageEl = feedEl = threadEl = phoneEl = headlineEl = presenceNode = null;
  }

  function paintWallpaper(stage) {
    var th = stage.querySelector(".thread");
    if (!th) return;
    var SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>" +
      "<g fill='none' stroke='#6b5d45' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round' stroke-opacity='0.05'>" +
      "<path d='M30 44c-6-9-18-4-18 4 0 7 9 12 18 19 9-7 18-12 18-19 0-8-12-13-18-4z'/>" +
      "<path d='M150 28h26v12a13 13 0 0 1-13 13 13 13 0 0 1-13-13z'/><path d='M176 32h6a5 5 0 0 1 0 10h-6'/><path d='M150 60h26'/>" +
      "<path d='M104 96l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z'/>" +
      "<circle cx='44' cy='150' r='17'/><path d='M38 147h.1M50 147h.1M37 156a9 9 0 0 0 14 0'/>" +
      "<rect x='150' y='150' width='40' height='28' rx='5'/><circle cx='170' cy='164' r='8'/><path d='M158 150l3-5h18l3 5'/>" +
      "<path d='M192 92v26a8 8 0 1 1-5-7V96l14-4v22a8 8 0 1 1-5-7'/>" +
      "<path d='M96 188c-12 2-22-6-22-18 12-2 22 6 22 18z'/><path d='M96 188c0-10 8-18 18-18'/>" +
      "</g></svg>";
    th.style.backgroundImage = "url(\"data:image/svg+xml," + encodeURIComponent(SVG) + "\")";
    th.style.backgroundSize = "220px 220px";
  }

  /* ======================================================================
   * THREAD RENDERING.
   * ==================================================================== */
  var TIME = "14:32";
  function el(cls, html) { var d = document.createElement("div"); d.className = cls; d.innerHTML = html; feedEl.appendChild(d); return d; }
  function avatar() { var b = cfg.business || {}; return '<div class="av-sm"><img src="' + attr(b.avatar) + '" alt="" loading="lazy" decoding="async"/></div>'; }
  function ticks() { return platform === "whatsapp" ? '<span class="ic">' + ic("check-double", 16, { color: "#53bdeb" }) + "</span>" : ""; }
  function metaOut() { return platform === "whatsapp" ? '<div class="meta"><span class="t">' + TIME + "</span>" + ticks() + "</div>" : ""; }
  function metaIn() { return platform === "whatsapp" ? '<div class="meta"><span class="t">' + TIME + "</span></div>" : ""; }

  function setPresence(typing) {
    if (!presenceNode) return;
    presenceNode.textContent = presenceText(typing);
    presenceNode.classList.toggle("typing", !!typing);
  }
  function showTyping() {
    setPresence(true);
    typingNode = el("row in", avatar() + '<div class="msg msg-in typing"><span></span><span></span><span></span></div>');
    reveal(typingNode);
  }
  function hideTyping() {
    setPresence(false);
    if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);
    typingNode = null;
  }

  function addDateSep() {
    var c = chrome();
    if (c.today) { var d = el("center-pill pill-date", tr(c.today)); reveal(d); }
    if (platform === "whatsapp") { var e = el("center-pill pill-enc", '<span class="ic">' + ic("lock", 14) + "</span>" + tr(ENC)); reveal(e); }
  }

  function igProfileIntro() {
    var b = cfg.business || {};
    var followers = cfg.igProfile && cfg.igProfile.followers ? tr(cfg.igProfile.followers) : "";
    var meta = "Instagram" + (followers ? " · " + followers : "");
    var node = el("ig-profile", '<div class="ig-pic"><img src="' + attr(b.avatar) + '" alt=""/></div>' +
      '<div class="ig-pname">' + (b.name || "") + "</div><div class=\"ig-pmeta\">" + meta + "</div>");
    node.classList.add("shown");
  }

  // Render a single thread item (returns the row node).
  function renderItem(item) {
    var sent = isSent(item.from);
    var beat = item.beat;
    if (beat === "photo") {
      return el("row in", avatar() + '<div class="beat-photo"><div class="ph-img"><img src="' + attr(cfg.contentImage) +
        '" alt="" loading="lazy" decoding="async"/></div></div>');
    }
    if (beat === "bookingButton") {
      return el("row in", avatar() + '<div class="cta-wrap"><div class="msg msg-in">' + tr(item.text) + "</div>" +
        '<button type="button" class="cta-btn">' + ic("calendar", 20, { color: "#fff" }) + " " + tr(CTA_LABEL) + "</button></div>");
    }
    if (beat === "publicReply") {
      var b = cfg.business || {};
      return el("row in beat-row", '<div class="public-reply"><div class="pr-av"><img src="' + attr(b.avatar) + '" alt=""/></div>' +
        '<div class="pr-body"><div class="pr-name">' + (b.name || "") + '</div><div class="pr-text">' + tr(item.text) + "</div></div></div>");
    }
    // plain bubble (includes orderConfirm — DESIGN_DOC: a NORMAL text bubble)
    if (sent) return el("row out", '<div class="msg msg-out">' + tr(item.text) + metaOut() + "</div>");
    return el("row in", avatar() + '<div class="msg msg-in">' + tr(item.text) + metaIn() + "</div>");
  }

  /* ======================================================================
   * TIMELINE.
   * ==================================================================== */
  function run() {
    feedEl = stageEl.querySelector("#feed");
    threadEl = stageEl.querySelector("#thread");
    presenceNode = stageEl.querySelector("#presence");
    reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var thread = locale().thread || [];
    if (surface === "widget") { runWidget(thread); return; }
    if (reduce) { renderStatic(thread); return; }
    playTimeline(thread);
  }

  function playTimeline(thread) {
    if (platform === "instagram") igProfileIntro();
    var t = 200;
    after(t, addDateSep);
    thread.forEach(function (item, idx) {
      var sent = isSent(item.from);
      if (idx === 0) t += FIRST; else if (sent) t += READ_GAP; else t += AFTER_TYPING;
      if (!sent) {
        after(t, showTyping);
        t += TYPING;
        after(t, function () { hideTyping(); reveal(renderItem(item)); });
      } else {
        after(t, function () { reveal(renderItem(item)); });
      }
      if (item.beat === "orderConfirm" || item.beat === "bookingButton") {
        t += PRE_SCENE;
        after(t, startScene);
      }
    });
    if (!cfg.scene) { t += PRE_SCENE; after(t, makeThreadScrollable); }
  }

  function makeThreadScrollable() {
    if (!threadEl) return;
    threadEl.classList.add("scrollable");
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  function renderStatic(thread) {
    // Full static end frame: whole thread + (if any) the scene end-state.
    if (platform === "instagram") igProfileIntro();
    addDateSep();
    var c = chrome();
    // mark date pills shown
    thread.forEach(function (item) { renderItem(item).classList.add("shown"); });
    var pills = feedEl.querySelectorAll(".center-pill"); for (var i = 0; i < pills.length; i++) pills[i].classList.add("shown");
    if (cfg.scene) startScene(true);
    else makeThreadScrollable();
  }

  /* ======================================================================
   * SCENES (the honest finale).
   * ==================================================================== */
  function startScene(staticEnd) {
    makeThreadScrollable();
    var html = cfg.scene === "booking" ? bookingHTML() : orderHTML();
    var container;

    if (surface === "widget") {
      // Widget: the booking page opens IN the browser frame (replaces the site);
      // the chat panel closes back to the launcher so the booking page is fully visible.
      var wp = stageEl.querySelector("#wpanel"); if (wp) wp.classList.remove("open");
      var lz = stageEl.querySelector("#launcher"); if (lz) lz.style.display = "";
      var bz = stageEl.querySelector("#bzpage");
      if (bz) { bz.innerHTML = '<div class="scene-host">' + html + "</div>"; container = bz.firstChild; container.style.height = "100%"; }
    } else {
      if (mode === "desktop" && headlineEl) headlineEl.classList.add("faded");
      var panel = document.createElement("div");
      panel.className = "scene-panel";
      panel.innerHTML = html;
      stageEl.appendChild(panel);
      container = panel;
      if (staticEnd) panel.classList.add("shown");
      else reveal(panel);
    }
    if (!container) return;

    if (cfg.scene === "booking") {
      if (staticEnd) bookingFinalState(container); else animateBooking(container);
    } else {
      if (staticEnd) { var bl = container.querySelectorAll(".ord-reveal"); for (var i = 0; i < bl.length; i++) bl[i].classList.add("shown"); }
      else animateOrder(container);
    }
  }

  /* ---- ORDER scene markup + animation. ---------------------------------- */
  function orderHTML() {
    var o = cfg.order || {};
    var cust = o.customer || {};
    var items = o.items || [];
    var checkout = o.checkout || [];
    var initials = (cust.name || "?").split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join("").toUpperCase();
    var chanIcon = platform === "whatsapp" ? ic("wa-logo", 15, { color: "#25d366" }) : ic(platform + "-logo", 15);
    var PNAME = { whatsapp: "WhatsApp", instagram: "Instagram", messenger: "Messenger", facebook: "Facebook", widget: "Web" };
    var chanName = PNAME[platform] || platform;

    var qa = checkout.map(function (c) {
      return '<div><div class="ord-q">' + tr(c.q) + '</div><div class="ord-a">' + tr(c.a) + "</div></div>";
    }).join("");
    var rows = items.map(function (it) {
      var note = it.note ? '<div class="pnote">' + tr(it.note) + "</div>" : "";
      return "<tr><td><span class=\"pname\">" + tr(it.name) + "</span>" + note + '</td><td class="c-qty">' + (it.qty != null ? it.qty : 1) + "</td></tr>";
    }).join("");

    return '<div class="ord-frame">' +
      '<div class="ord-titlebar"><div class="ord-dots"><span></span><span></span><span></span></div>' +
        '<span class="ord-tab"><span class="ic">' + ic("message-square", 16) + "</span>" + tr(ORDER_T.title) + "</span></div>" +
      '<div class="ord-body">' +
        '<div class="ord-reveal ord-head"><div class="ord-num">' + tr(ORDER_T.orderNo) + " #" + (o.number || "") + "</div>" +
          '<span class="ord-badge"><span class="ic">' + ic("check-circle-fill", 17, { color: "#129578" }) + "</span>" + tr(ORDER_T.confirmed) + "</span></div>" +
        '<div class="ord-reveal ord-card"><div class="ord-card-label">' + tr(ORDER_T.customer) + "</div>" +
          '<div class="ord-cust"><div class="ord-cust-av">' + initials + "</div><div>" +
            '<div class="ord-cust-name">' + (cust.name || "") + "</div>" +
            '<div class="ord-cust-meta"><span class="chan">' + chanIcon + " " + chanName + "</span>" +
              (cust.phone ? '<span class="dot-sep"></span>' + cust.phone : "") + "</div></div></div></div>" +
        (checkout.length ? '<div class="ord-reveal ord-card"><div class="ord-card-label">' + tr(ORDER_T.checkout) + '</div><div class="ord-qa">' + qa + "</div></div>" : "") +
        '<div class="ord-reveal ord-card"><div class="ord-card-label">' + tr(ORDER_T.products) + "</div>" +
          '<table class="ord-table"><thead><tr><th>' + tr(ORDER_T.colProduct) + '</th><th class="c-qty">' + tr(ORDER_T.colQty) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<div class="ord-reveal"><span class="ord-foot"><span class="ic">' + ic("message-square", 16) + "</span>" + tr(ORDER_T.fromChat) + "</span></div>" +
      "</div></div>";
  }
  function animateOrder(container) {
    var blocks = container.querySelectorAll(".ord-reveal");
    for (var i = 0; i < blocks.length; i++) (function (b, idx) { later(520 + idx * 170, function () { b.classList.add("shown"); }); })(blocks[i], i);
  }

  /* ---- BOOKING scene markup + animation. -------------------------------- */
  function bookingDateLabel(day) {
    var wd = day % 7;
    return lang === "es" ? WEEKDAY.es[wd] + " " + day + " de junio" : WEEKDAY.en[wd] + ", June " + day;
  }
  function calendarGrid(pickDay) {
    var dow = BOOK_T.dow[lang].map(function (d) { return '<div class="bk-dow">' + d + "</div>"; }).join("");
    var cells = "<div></div>"; // June 1 2026 = Monday → 1 leading blank (Sunday-first grid)
    for (var d = 1; d <= 30; d++) {
      cells += '<div class="bk-day" ' + (d === pickDay ? 'data-pick="1"' : "") + ">" + d + "</div>";
    }
    return '<div class="bk-grid">' + dow + cells + "</div>";
  }
  function bookingHTML() {
    var svc = cfg.bookingService || {};
    var picked = svc.picked || {};
    var slots = BOOK_T.slots[lang];
    var pickedTime = tr(picked.time) || slots[1];
    var slotsHTML = slots.map(function (s) { return '<div class="bk-slot" data-time="' + attr(s) + '">' + s + "</div>"; }).join("");

    return '<div class="bk-frame">' +
      '<div class="bk-topbar"><span class="bk-brand"><span class="rcai-mark"><svg width="20" height="20" viewBox="0 0 32 32" fill="none"><circle cx="12" cy="16" r="3.2" fill="#fff"/><circle cx="20" cy="16" r="3.2" fill="#fff"/></svg></span>ReadyChat<span class="accent">AI</span></span>' +
        '<span class="bk-lang">' + ic("globe", 16) + " " + lang.toUpperCase() + "</span></div>" +
      '<div class="bk-steps">' +
        '<div class="bk-step active" data-step="1"><span class="num">1</span><span class="lbl">' + tr(BOOK_T.step1) + "</span></div>" +
        '<div class="bk-stepline"></div>' +
        '<div class="bk-step" data-step="2"><span class="num">2</span><span class="lbl">' + tr(BOOK_T.step2) + "</span></div>" +
      "</div>" +
      '<div class="bk-fade bk-step1">' +
        '<div class="bk-title">' + tr(BOOK_T.title) + '</div><div class="bk-subtitle">' + tr(BOOK_T.subtitle) + "</div>" +
        '<div class="bk-body"><div class="bk-card-row">' +
          '<div class="bk-col"><div class="bk-svc-name">' + tr(svc.name) + "</div>" +
            (svc.category ? '<div class="bk-svc-cat">' + tr(svc.category) + "</div>" : "") +
            '<div class="bk-svc-dur">' + ic("clock", 16) + " " + tr(svc.duration) + "</div>" +
            (svc.desc ? '<div class="bk-svc-desc">' + tr(svc.desc) + "</div>" : "") + "</div>" +
          '<div class="bk-col"><div class="bk-cal-title">' + tr(BOOK_T.selectDate) + "</div>" +
            '<div class="bk-cal-head"><span class="bk-cal-month">' + tr(BOOK_T.month) + '</span><span class="bk-cal-navs">' + ic("chevron-left", 18) + ic("chevron-right", 18) + "</span></div>" +
            calendarGrid(picked.day || 0) + "</div>" +
          '<div class="bk-col"><div class="bk-times-title">' + tr(BOOK_T.times) + "</div>" +
            '<div class="bk-times-empty" id="bk-empty">' + tr(BOOK_T.timesEmpty) + "</div>" +
            '<div class="bk-times" id="bk-times" style="display:none">' + slotsHTML + "</div></div>" +
        "</div>" +
        '<div class="bk-continue"><button type="button" id="bk-continue">' + tr(BOOK_T.continue) + "</button></div></div>" +
      "</div>" +
      bookingConfirmHTML(svc, picked, pickedTime, true) +
      '<div class="bk-foot"><span>' + tr(BOOK_T.rights) + '</span><span class="links"><span>' + tr(BOOK_T.privacy) + "</span><span>" + tr(BOOK_T.terms) + "</span></span></div>" +
    "</div>";
  }
  function bookingConfirmHTML(svc, picked, pickedTime, hidden) {
    return '<div class="bk-body bk-confirm-wrap"' + (hidden ? ' style="display:none"' : "") + '><div class="bk-confirm">' +
      '<div class="ok">' + icon("check-circle", 34, { stroke: 2.2, color: "#129578" }) + "</div>" +
      '<div class="ctitle">' + tr(BOOK_T.confirmedTitle) + '</div><div class="csvc">' + tr(svc.name) + "</div>" +
      '<div class="crows">' +
        '<div class="crow">' + icon("calendar", 20) + " " + bookingDateLabel(picked.day || 13) + "</div>" +
        '<div class="crow">' + icon("clock", 20) + " " + pickedTime + " · " + tr(svc.duration) + "</div>" +
        (cfg.business && cfg.business.name ? '<div class="crow">' + icon("map-pin", 20) + " " + cfg.business.name + "</div>" : "") +
      "</div></div></div>";
  }
  function bookingRevealTimes(container, pickedTime) {
    var pickEl = container.querySelector('.bk-day[data-pick="1"]'); if (pickEl) pickEl.classList.add("pick");
    var empty = container.querySelector("#bk-empty"); if (empty) empty.style.display = "none";
    var times = container.querySelector("#bk-times"); if (times) times.style.display = "";
  }
  function bookingSelectSlot(container, pickedTime) {
    var slots = container.querySelectorAll(".bk-slot"); var matched = false;
    for (var i = 0; i < slots.length; i++) { if (slots[i].getAttribute("data-time") === pickedTime) { slots[i].classList.add("sel"); matched = true; } }
    if (!matched && slots[1]) slots[1].classList.add("sel");
    var cont = container.querySelector("#bk-continue"); if (cont) cont.classList.add("ready");
  }
  function bookingGoToConfirm(container, instant) {
    var s1 = container.querySelector(".bk-step1");
    var conf = container.querySelector(".bk-confirm-wrap");
    var step1 = container.querySelector('.bk-step[data-step="1"]'); if (step1) { step1.classList.remove("active"); step1.classList.add("done"); }
    var step2 = container.querySelector('.bk-step[data-step="2"]'); if (step2) step2.classList.add("active");
    function showConfirm() {
      if (s1) s1.style.display = "none";
      if (conf) { conf.style.display = "flex"; if (instant) conf.classList.add("shown"); else requestAnimationFrame(function () { requestAnimationFrame(function () { conf.classList.add("shown"); }); }); }
    }
    if (instant) { showConfirm(); return; }
    if (s1) s1.classList.add("hide");
    later(380, showConfirm);
  }
  function bookingFinalState(container) {
    var picked = (cfg.bookingService || {}).picked || {};
    var pickedTime = tr(picked.time) || BOOK_T.slots[lang][1];
    bookingRevealTimes(container, pickedTime);
    bookingSelectSlot(container, pickedTime);
    bookingGoToConfirm(container, true);
  }
  function animateBooking(container) {
    var picked = (cfg.bookingService || {}).picked || {};
    var pickedTime = tr(picked.time) || BOOK_T.slots[lang][1];
    later(900, function () { var p = container.querySelector('.bk-day[data-pick="1"]'); if (p) p.classList.add("pick"); });
    later(1700, function () { bookingRevealTimes(container, pickedTime); });
    later(2700, function () { bookingSelectSlot(container, pickedTime); });
    later(4000, function () { bookingGoToConfirm(container); });
  }

  /* ======================================================================
   * WIDGET surface playback (browser → launcher pulses → panel opens → chat).
   * ==================================================================== */
  function runWidget(thread) {
    var launcher = stageEl.querySelector("#launcher");
    var panel = stageEl.querySelector("#wpanel");
    feedEl = stageEl.querySelector("#feed");
    threadEl = stageEl.querySelector("#thread");
    presenceNode = stageEl.querySelector("#presence");
    if (reduce) {
      if (launcher) launcher.style.display = "none";
      if (panel) panel.classList.add("open");
      renderStatic(thread);
      return;
    }
    if (launcher) launcher.classList.add("pulsing");
    after(2300, function () {
      if (launcher) launcher.style.display = "none";
      if (panel) panel.classList.add("open");
      after(700, function () { playTimeline(thread); });
    });
  }

  /* ======================================================================
   * BOOT.
   * ==================================================================== */
  function boot() {
    // When embedded in the landing hero (iframe), the landing owns the ES|EN toggle,
    // so hide the in-stage one. Standalone (opened directly) keeps its own toggle.
    try { if (window.self !== window.top) document.documentElement.setAttribute("data-embedded", "1"); }
    catch (e) { document.documentElement.setAttribute("data-embedded", "1"); }
    cfg = global.DEMO_CONFIG || {};
    mode = cfg.mode === "mobile" ? "mobile" : "desktop";
    platform = cfg.platform || "whatsapp";
    surface = cfg.surface || (platform === "widget" ? "widget" : "phone");
    lang = getLang();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { buildStage(); run(); }, { once: true });
    } else { buildStage(); run(); }
  }

  global.RCAIDemo = { boot: boot };
})(typeof window !== "undefined" ? window : this);

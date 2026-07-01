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

  /* ---- Customer-message streaming (DESIGN_DOC_V3 §2). The customer's own
   * turns type char-by-char into the composer, then "send". These constants are
   * SHARED by streamCustomer() (the animation) and streamDuration() (the timeline
   * accounting) so the two never drift. STREAM_PRE replaces READ_GAP for a sent
   * turn (the compose-type itself eats the rest of the old read gap). ---------- */
  var CPS = 34, STREAM_PRE = 1250, STREAM_FOCUS = 170, STREAM_SEND = 360;

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
  /* Order bridge → right-side transition-intro (DESIGN_DOC_V3 §1b/§4). Shown on
   * the RIGHT (never as a chat bubble) before the dashboard builds. */
  var ORDER_INTRO = {
    saving: { es:"Guardando tu pedido en el sistema…", en:"Saving your order to the system…" }
  };
  function orderSavedText() {
    var n = (cfg.order || {}).number || "";
    return { es:"✓ Pedido #" + n + " guardado", en:"✓ Order #" + n + " saved" };
  }
  var BOOK_T = {
    step1:   { es:"Elegir hora", en:"Choose Time" },
    step2:   { es:"Confirmar", en:"Confirm" },
    title:   { es:"Elige fecha y hora", en:"Choose Date & Time" },
    subtitle:{ es:"Selecciona tu fecha y horario preferido", en:"Choose your preferred date and time slot" },
    selectDate:{ es:"Elige una fecha", en:"Select a Date" },
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
  var KB_T = {
    tab:      { es:"Base de conocimiento", en:"Knowledge Base" },
    title:    { es:"Base de conocimiento", en:"Knowledge Base" },
    unanswered:{ es:"Sin responder", en:"Unanswered" },
    answered: { es:"Respondidas", en:"Answered" },
    open:     { es:"Abierta", en:"Open" },
    resolved: { es:"Resuelta", en:"Resolved" },
    answerLabel:{ es:"Respuesta", en:"Answer" },
    send:     { es:"Enviar", en:"Send" },
    learning: { es:"El bot está aprendiendo…", en:"The bot is learning…" },
    learned:  { es:"¡Aprendido! El bot ya sabe responder esto", en:"Learned! The bot can now answer this" },
    ago2:     { es:"hace 2 min", en:"2 min ago" }
  };
  var LEARN_T = {
    divider:    { es:"Otra clienta, más tarde 🌙", en:"Another customer, later 🌙" },
    learnedPill:{ es:"El bot aprendió esta respuesta ✨", en:"The bot learned this answer ✨" }
  };

  /* ---- Engine state. ----------------------------------------------------- */
  var cfg, lang, mode, platform, surface, reduce;
  var stageEl, feedEl, threadEl, phoneEl, headlineEl, presenceNode, typingNode = null;
  var igIntroNode = null;
  var timers = [];
  /* Visibility-resilient playback (DESIGN_DOC_V3 §1a). `started` flips once run()
   * actually begins; `finished` flips when the timeline+scene reach their resting
   * end; `hiddenAt` timestamps the last tab-hide so we can require a ≥800ms hide
   * before restarting (ignores quick focus flickers). */
  var started = false, finished = false, hiddenAt = 0, visBound = false;
  function markFinished() { finished = true; }

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
        '<span class="eyebrow">' + brandMark() + " " + tr(s.eyebrow) + "</span>" +
        langToggle() +
      "</div>";
    }
    return '<div class="headline" id="headline">' +
      langToggle() +
      '<span class="eyebrow">' + brandMark() + " " + tr(s.eyebrow) + "</span>" +
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
        '<div class="wp-composer"><span class="ph">' + (lang === "es" ? "Escribe un mensaje…" : "Type a message…") + "</span>" +
          '<span class="ic wp-send">' + ic("send-horizontal", 20, { color: "#7354ef" }) + "</span></div>" +
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
        restart();
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
    // Pinned overlay at the TOP of the thread (NOT a feed item), so it never
    // sits at the bottom; it fades away on the first message. (DESIGN_DOC_V2 §3)
    var node = document.createElement("div");
    node.className = "ig-profile";
    node.innerHTML = '<div class="ig-pic"><img src="' + attr(b.avatar) + '" alt=""/></div>' +
      '<div class="ig-pname">' + (b.name || "") + "</div><div class=\"ig-pmeta\">" + meta + "</div>";
    (threadEl || feedEl).appendChild(node);
    igIntroNode = node;
    reveal(node);
  }
  function dismissIgProfile() {
    if (!igIntroNode) return;
    var n = igIntroNode; igIntroNode = null;
    n.classList.add("gone");
    later(600, function () { if (n.parentNode) n.parentNode.removeChild(n); });
  }

  /* ======================================================================
   * POST VIEW + comment→DM (comment-flow channels). DESIGN_DOC_V2 §5.
   * ==================================================================== */
  var AV_COLORS = ["#f0729a", "#7a9cf0", "#5ab98f", "#e0a34a", "#c07af0"];
  function initialsOf(name) {
    return String(name || "?").replace(/^@/, "").split(/[\s._-]+/)
      .map(function (w) { return w.charAt(0); }).slice(0, 2).join("").toUpperCase();
  }
  function avColor(name) { var s = String(name || "x"); return AV_COLORS[s.length % AV_COLORS.length]; }

  function postScreenHTML() {
    var b = cfg.business || {};
    var p = cfg.post || {};
    var isAd = p.kind === "ad";
    var handle = b.handle ? String(b.handle).replace(/^@/, "") : (b.name || "");
    var tag = isAd ? (lang === "es" ? "Publicidad" : "Sponsored") : (lang === "es" ? "Publicación" : "Post");
    var img = p.image || cfg.contentImage;
    var actions = platform === "instagram"
      ? icon("ig-heart", 25) + icon("message-square", 23) + icon("send", 22) + '<span class="pa-right">' + icon("bookmark", 22) + "</span>"
      : icon("ig-heart", 24) + icon("message-square", 22) + icon("send", 21);
    var likes = lang === "es" ? "1.204 Me gusta" : "1,204 likes";
    var commentPh = lang === "es" ? "Añade un comentario…" : "Add a comment…";
    return '<div class="post-screen" id="post-screen">' +
      '<div class="post-topbar"><span class="ic">' + ic("chevron-left", 24, { stroke: 2.2 }) + "</span>" +
        '<span class="ptb-title">' + tag + '</span><span class="ic">' + ic("more-v", 20) + "</span></div>" +
      '<div class="post-scroll">' +
        '<div class="post-author"><div class="post-av"><img src="' + attr(b.avatar) + '" alt=""/></div>' +
          "<div><div class=\"post-name\">" + handle + "</div>" +
            '<div class="post-tag">' + (isAd ? tag : (b.name || "")) + "</div></div>" +
          '<span class="ic post-more">' + ic("more-v", 20) + "</span></div>" +
        '<div class="post-media"><img src="' + attr(img) + '" alt="" decoding="async"/></div>' +
        '<div class="post-actions">' + actions + "</div>" +
        '<div class="post-likes">' + likes + "</div>" +
        '<div class="post-caption"><b>' + handle + "</b> " + tr(p.caption) + "</div>" +
        '<div class="post-comments" id="post-comments"></div>' +
        '<div class="post-handoff" id="post-handoff">' + ic("send", 16, { color: "#7354ef" }) + " " + tr(handoffLabel()) + "</div>" +
      "</div>" +
      '<div class="post-composer"><div class="pcx-av"></div><span class="pcx-ph">' + commentPh + "</span></div>" +
    "</div>";
  }
  function handoffLabel() {
    var toMsgr = platform === "facebook";
    return {
      es: toMsgr ? "Respondido — seguimos por Messenger 💬" : "Respondido — seguimos por mensaje directo 💬",
      en: toMsgr ? "Replied — continuing in Messenger 💬" : "Replied — continuing in Direct Messages 💬"
    };
  }
  function runCommentFlow(thread) {
    var screen = phoneEl.querySelector(".screen");
    if (!screen) { playTimeline(thread); return; }
    var host = document.createElement("div"); host.innerHTML = postScreenHTML();
    var ps = host.firstChild; screen.appendChild(ps); reveal(ps);
    var comments = ps.querySelector("#post-comments");
    var handoff = ps.querySelector("#post-handoff");
    var scroll = ps.querySelector(".post-scroll");
    function toBottom() { if (scroll) later(60, function () { scroll.scrollTop = scroll.scrollHeight; }); }
    var b = cfg.business || {};
    var p = cfg.post || {};
    var cUser = (p.comment && p.comment.user) || "user";
    var t = 1500;
    // 1) the customer's comment on the post
    after(t, function () {
      var it = document.createElement("div"); it.className = "pc-item";
      it.innerHTML = '<div class="pc-av" style="background:' + avColor(cUser) + '">' + initialsOf(cUser) + "</div>" +
        '<div class="pc-body"><span class="pc-user">' + cUser + '</span><div class="pc-text">' + tr(p.comment && p.comment.text) + "</div></div>";
      comments.appendChild(it); reveal(it);
    });
    // 2) the business "replying" (typing) on the comment
    t += 1600; var typingRow = null;
    after(t, function () {
      typingRow = document.createElement("div"); typingRow.className = "pc-item pc-reply shown";
      typingRow.innerHTML = '<div class="pc-av"><img src="' + attr(b.avatar) + '" alt=""/></div>' +
        '<div class="pc-body"><span class="pc-user">' + (b.name || "") + '</span><div class="pc-typing"><span></span><span></span><span></span></div></div>';
      comments.appendChild(typingRow); toBottom();
    });
    // 3) the PUBLIC reply
    t += 1800;
    after(t, function () {
      if (typingRow && typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
      var it = document.createElement("div"); it.className = "pc-item pc-reply";
      it.innerHTML = '<div class="pc-av"><img src="' + attr(b.avatar) + '" alt=""/></div>' +
        '<div class="pc-body"><span class="pc-user">' + (b.name || "") + '</span><span class="pc-badge">' +
          (lang === "es" ? "Responde" : "Replied") + '</span><div class="pc-text">' + tr(p.publicReply) + "</div></div>";
      comments.appendChild(it); reveal(it); toBottom();
    });
    // 4) hand-off pill, then cross-fade to the DM and play it
    t += 2200;
    after(t, function () { if (handoff) handoff.classList.add("shown"); toBottom(); });
    t += 1800;
    after(t, function () {
      ps.classList.add("gone");
      later(520, function () { if (ps.parentNode) ps.parentNode.removeChild(ps); });
      playTimeline(thread);
    });
  }

  /* ======================================================================
   * LEARN FLOW (IG DM "the bot learns"): conv1 → KB scene → conv2.
   * DESIGN_DOC_V2 §7. The honest loop: bot saves an unanswered question, the
   * owner answers it in the KB, then the bot answers a similar one next time.
   * ==================================================================== */
  function playSubThread(thread, startT, onDone) {
    var t = startT;
    thread.forEach(function (item, idx) {
      if (item.beat === "openOrder") return;
      var sent = isSent(item.from);
      if (idx === 0) t += FIRST; else if (sent) t += STREAM_PRE; else t += AFTER_TYPING;
      // On the FIRST bubble, fade + remove the IG profile intro (DESIGN_DOC_V2 §3);
      // mirrors the normal-flow dismiss (t-220). No-op for conv2 (igIntroNode null).
      if (idx === 0 && igIntroNode) after(Math.max(0, t - 220), dismissIgProfile);
      if (item.beat === "learnedPill") {
        after(t, function () { reveal(renderItem(item)); });
        t += 500; return;
      }
      if (!sent) {
        after(t, showTyping); t += TYPING;
        after(t, function () { hideTyping(); reveal(renderItem(item)); });
      } else {
        after(t, function () { streamCustomer(item, function () { reveal(renderItem(item)); }); });
        t += streamDuration(item);
      }
    });
    t += BEAT_HOLD;
    if (onDone) after(t, onDone);
    return t;
  }

  function kbHTML(L) {
    var q = tr(L.question);
    return '<div class="kb-frame">' +
      '<div class="kb-titlebar"><div class="kb-dots"><span></span><span></span><span></span></div>' +
        '<span class="kb-tabname">' + ic("message-square", 16) + " " + tr(KB_T.tab) + "</span></div>" +
      '<div class="kb-learnbar" id="kb-learnbar">🧠 ' + tr(KB_T.learning) + "</div>" +
      '<div class="kb-head"><div class="kb-title">' + tr(KB_T.title) + "</div>" +
        '<div class="kb-tabs"><span class="kb-tab active">' + tr(KB_T.unanswered) + ' <b id="kb-count">1</b></span>' +
          '<span class="kb-tab">' + tr(KB_T.answered) + ' <b id="kb-answered-count">0</b></span></div></div>' +
      '<div class="kb-body">' +
        '<div class="kb-list"><div class="kb-qrow selected" id="kb-qrow">' +
          '<span class="kb-dot"></span><div class="kb-qmeta"><div class="kb-qtext">' + q + "</div>" +
            '<div class="kb-qtime">' + ic("ig-logo", 14) + " " + tr(KB_T.ago2) + "</div></div></div></div>" +
        '<div class="kb-detail"><div class="kb-detail-head">' + ic("ig-logo", 15) + " Instagram " +
          '<span class="kb-badge open" id="kb-badge">' + tr(KB_T.open) + "</span></div>" +
          '<div class="kb-question">' + q + "</div>" +
          '<div class="kb-answer-label">' + tr(KB_T.answerLabel) + "</div>" +
          '<div class="kb-textarea" id="kb-textarea"></div>' +
          '<div class="kb-actions"><button type="button" class="kb-send" id="kb-send">' + ic("send", 18, { color: "#fff" }) + " " + tr(KB_T.send) + "</button></div>" +
        "</div></div></div>";
  }
  function typeInto(node, text, cps, done) {
    node.innerHTML = '<span class="kb-typed"></span><span class="kb-caret"></span>';
    var typed = node.querySelector(".kb-typed");
    var caret = node.querySelector(".kb-caret");
    var i = 0;
    function step() {
      if (i >= text.length) { if (caret && caret.parentNode) caret.parentNode.removeChild(caret); if (done) done(); return; }
      i += 1; typed.textContent = text.slice(0, i);
      timers.push(setTimeout(step, Math.round(1000 / cps)));
    }
    step();
  }
  function animateKb(container, L, onLearned) {
    var ta = container.querySelector("#kb-textarea");
    var send = container.querySelector("#kb-send");
    var badge = container.querySelector("#kb-badge");
    var row = container.querySelector("#kb-qrow");
    var count = container.querySelector("#kb-count");
    var bar = container.querySelector("#kb-learnbar");
    var answer = tr(L.answer);
    later(1100, function () {
      if (ta) ta.classList.add("typing");
      typeInto(ta, answer, 33, function () {
        later(500, function () { if (send) send.classList.add("ready"); });
        later(1200, function () { if (send) send.classList.add("pressed"); });
        later(1520, function () {
          if (send) send.classList.remove("pressed");
          if (ta) ta.classList.remove("typing");
          if (badge) { badge.classList.remove("open"); badge.classList.add("resolved"); badge.textContent = tr(KB_T.resolved); }
          if (row) row.classList.add("resolved");
          if (count) count.textContent = "0";
          var answered = container.querySelector("#kb-answered-count"); if (answered) answered.textContent = "1";
          if (bar) { bar.classList.add("done"); bar.innerHTML = "✨ " + tr(KB_T.learned); }
          if (onLearned) later(1000, onLearned);
        });
      });
    });
  }
  function openKbScene(L, onLearned, staticEnd) {
    makeThreadScrollable();
    if (mode === "desktop" && headlineEl) headlineEl.classList.add("faded");
    var panel = document.createElement("div");
    panel.className = "scene-panel kb-panel";
    panel.innerHTML = kbHTML(L);
    stageEl.appendChild(panel);
    if (staticEnd) {
      panel.classList.add("shown");
      var ta = panel.querySelector("#kb-textarea"); if (ta) ta.textContent = tr(L.answer);
      var badge = panel.querySelector("#kb-badge"); if (badge) { badge.classList.remove("open"); badge.classList.add("resolved"); badge.textContent = tr(KB_T.resolved); }
      var row = panel.querySelector("#kb-qrow"); if (row) row.classList.add("resolved");
      var count = panel.querySelector("#kb-count"); if (count) count.textContent = "0";
      var answered = panel.querySelector("#kb-answered-count"); if (answered) answered.textContent = "1";
      var bar = panel.querySelector("#kb-learnbar"); if (bar) { bar.classList.add("done"); bar.innerHTML = "✨ " + tr(KB_T.learned); }
      var send = panel.querySelector("#kb-send"); if (send) send.classList.add("ready");
      return;
    }
    reveal(panel);
    animateKb(panel, L, onLearned);
  }
  function resetThreadForConv2() {
    if (mode === "mobile") { var sp = stageEl.querySelector(".kb-panel"); if (sp) { sp.classList.add("gone"); (function (n) { later(520, function () { if (n.parentNode) n.parentNode.removeChild(n); }); })(sp); } }
    if (feedEl) feedEl.innerHTML = "";
    if (threadEl) {
      threadEl.classList.remove("scrollable"); threadEl.scrollTop = 0;
      var ig = threadEl.querySelector(".ig-profile"); if (ig && ig.parentNode) ig.parentNode.removeChild(ig);
    }
    igIntroNode = null;
    typingNode = null;
  }
  function startConv2(L) {
    resetThreadForConv2();
    var t = 300;
    after(t, function () { var d = el("center-pill pill-date", tr(LEARN_T.divider)); reveal(d); });
    playSubThread(L.conv2 || [], t + 200, function () { makeThreadScrollable(); markFinished(); });
  }
  function runLearnFlow() {
    var L = locale().learn || {};
    if (platform === "instagram") igProfileIntro();
    var t = 200;
    after(t, addDateSep);
    if (igIntroNode) t += 1000;
    t = playSubThread(L.conv1 || [], t, null);
    t += PRE_SCENE;
    after(t, function () { openKbScene(L, function () { startConv2(L); }); });
  }
  function renderLearnStatic(L) {
    // Static end frame: conv2 (the "bot knows" end) + KB resolved on the right.
    addDateSep();
    var d = el("center-pill pill-date", tr(LEARN_T.divider)); d.classList.add("shown");
    (L.conv2 || []).forEach(function (item) { renderItem(item).classList.add("shown"); });
    var pills = feedEl.querySelectorAll(".center-pill"); for (var i = 0; i < pills.length; i++) pills[i].classList.add("shown");
    makeThreadScrollable();
    openKbScene(L, null, true);
    markFinished();
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
    if (beat === "learnedPill") {
      return el("learn-pill", ic("check-circle-fill", 16, { color: "#7f56d9" }) + " " + tr(LEARN_T.learnedPill));
    }
    // plain bubble (includes orderConfirm — DESIGN_DOC: a NORMAL text bubble)
    if (sent) return el("row out", '<div class="msg msg-out">' + tr(item.text) + metaOut() + "</div>");
    return el("row in", avatar() + '<div class="msg msg-in">' + tr(item.text) + metaIn() + "</div>");
  }

  /* ======================================================================
   * CUSTOMER MESSAGE STREAMING (DESIGN_DOC_V3 §2). Only customer|visitor turns:
   * the text types char-by-char into the composer (a .composer-typed node that
   * replaces the .ph placeholder), a short beat, then "send" → the outgoing
   * bubble appears and the composer resets. The bot keeps its typing-indicator.
   * ==================================================================== */
  function composerBar() {
    if (!stageEl) return null;
    // widget = the .wp-composer pill; phone platforms = the .composer .cbar pill.
    return surface === "widget"
      ? stageEl.querySelector(".wp-composer")
      : stageEl.querySelector(".composer .cbar");
  }
  // Glyph count that respects surrogate pairs (emoji), so slicing never renders a
  // lone half-emoji. Shared by streamCustomer + streamDuration to stay in lockstep.
  function glyphsOf(item) { return Array.from(tr(item.text) || ""); }
  // Timeline accounting — MUST stay in lockstep with streamCustomer()'s schedule.
  function streamDuration(item) {
    if (reduce) return 40;
    return STREAM_FOCUS + Math.round(glyphsOf(item).length * 1000 / CPS) + STREAM_SEND;
  }
  // Animate the customer typing `item` into the composer, then call onSent().
  function streamCustomer(item, onSent) {
    var bar = composerBar();
    var ph = bar && bar.querySelector(".ph");
    var glyphs = glyphsOf(item);
    if (reduce || !bar || !ph || !glyphs.length) { onSent(); return; }
    var typed = document.createElement("span");
    typed.className = "composer-typed";
    bar.insertBefore(typed, ph);            // sits where the placeholder was
    ph.style.display = "none";
    bar.classList.add("composing");
    var i = 0;
    function finishSend() {
      if (typed.parentNode) typed.parentNode.removeChild(typed);
      ph.style.display = "";
      bar.classList.remove("composing");
      onSent();
    }
    function step() {
      if (i >= glyphs.length) { later(STREAM_SEND, finishSend); return; }
      i += 1; typed.textContent = glyphs.slice(0, i).join("");
      typed.scrollLeft = typed.scrollWidth;   // follow the caret/tail like a real input
      timers.push(setTimeout(step, Math.round(1000 / CPS)));
    }
    timers.push(setTimeout(step, STREAM_FOCUS));
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
    if (cfg.learnFlow) { if (reduce) renderLearnStatic(locale().learn || {}); else runLearnFlow(); return; }
    if (reduce) { renderStatic(thread); return; }
    if (cfg.commentFlow) { runCommentFlow(thread); return; }
    playTimeline(thread);
  }

  function playTimeline(thread) {
    if (platform === "instagram" && !cfg.commentFlow) igProfileIntro();
    var t = 200;
    after(t, addDateSep);
    if (igIntroNode) t += 1000;   // let the IG profile intro breathe before msg 1
    thread.forEach(function (item, idx) {
      // Legacy order-bridge bubble is now a RIGHT-side transition, never a chat
      // bubble — drop it wherever a not-yet-updated config still ships it. (§1b/§4)
      if (item.beat === "openOrder") return;
      var sent = isSent(item.from);
      if (idx === 0) t += FIRST; else if (sent) t += STREAM_PRE; else t += AFTER_TYPING;
      if (idx === 0 && igIntroNode) after(Math.max(0, t - 220), dismissIgProfile);
      if (!sent) {
        after(t, showTyping);
        t += TYPING;
        after(t, function () { hideTyping(); reveal(renderItem(item)); });
      } else {
        after(t, function () { streamCustomer(item, function () { reveal(renderItem(item)); }); });
        t += streamDuration(item);
      }
      if (item.beat === "orderConfirm" || item.beat === "bookingButton") {
        if (item.beat === "bookingButton") after(Math.max(t, t + PRE_SCENE - 1500), tapCta);
        t += PRE_SCENE;
        after(t, startScene);
      }
    });
    if (!cfg.scene) { t += PRE_SCENE; after(t, function () { makeThreadScrollable(); markFinished(); }); }
  }

  function makeThreadScrollable() {
    if (!threadEl) return;
    threadEl.classList.add("scrollable");
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  /* ---- CTA tap (DESIGN_DOC_V3 §3): a simulated tap on the booking CTA button
   * (tap indicator lands + press scale + ripple) just before the calendar opens,
   * so the open reads as caused by the click. Booking channels only. --------- */
  function tapCta() {
    var btn = feedEl && feedEl.querySelector(".cta-btn");
    var wrap = btn && btn.parentNode;
    if (!btn || !wrap || btn.getAttribute("data-tapped")) return;
    btn.setAttribute("data-tapped", "1");
    var cx = btn.offsetLeft + btn.offsetWidth * 0.66;
    var cy = btn.offsetTop + btn.offsetHeight / 2;
    var dot = document.createElement("span");
    dot.className = "tap-dot";
    dot.style.left = cx + "px";
    dot.style.top = cy + "px";
    wrap.appendChild(dot);
    reveal(dot);                                   // dot glides slowly onto the button
    later(950, function () {
      dot.classList.add("press");                  // finger down (held, pronounced)
      btn.classList.add("pressed");                // button scales to ~0.93
      var rip = document.createElement("span");
      rip.className = "tap-ripple";
      rip.style.left = (btn.offsetWidth * 0.66) + "px";
      rip.style.top = (btn.offsetHeight / 2) + "px";
      btn.appendChild(rip);
      later(30, function () { rip.classList.add("go"); });
    });
    later(1300, function () { btn.classList.remove("pressed"); dot.classList.add("lift"); });
    later(1850, function () { if (dot.parentNode) dot.parentNode.removeChild(dot); });
  }

  function renderStatic(thread) {
    // Full static end frame: whole thread + (if any) the scene end-state.
    // (No ig-profile intro: it belongs to the START of the flow, gone by the end.)
    addDateSep();
    var c = chrome();
    // mark date pills shown
    thread.forEach(function (item) { if (item.beat === "openOrder") return; renderItem(item).classList.add("shown"); });
    var pills = feedEl.querySelectorAll(".center-pill"); for (var i = 0; i < pills.length; i++) pills[i].classList.add("shown");
    if (cfg.scene) startScene(true);
    else makeThreadScrollable();
    markFinished();
  }

  /* ======================================================================
   * SCENES (the honest finale).
   * ==================================================================== */
  // Mount a scene's markup in the right-side surface (phone → floating scene-panel;
  // widget → the browser frame, chat panel closing back to the launcher). Returns
  // the container element (or null if the widget frame is missing).
  function mountScenePanel(html, staticEnd) {
    var container;
    if (surface === "widget") {
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
    return container;
  }

  function startScene(staticEnd) {
    makeThreadScrollable();
    if (cfg.scene === "booking") {
      var bc = mountScenePanel(bookingHTML(), staticEnd);
      if (!bc) return;
      if (staticEnd) bookingFinalState(bc); else animateBooking(bc);
      return;
    }
    // ORDER — the bridge is a RIGHT-side "saving → saved" transition-intro that
    // morphs into the dashboard, NEVER a chat bubble. (DESIGN_DOC_V3 §1b/§4)
    var html = '<div class="ord-scene">' + orderIntroHTML() +
      '<div class="ord-morph" id="ord-morph">' + orderHTML() + "</div></div>";
    var oc = mountScenePanel(html, staticEnd);
    if (!oc) return;
    var morph = oc.querySelector(".ord-morph");
    if (staticEnd) {
      var intro = oc.querySelector(".ord-intro"); if (intro) intro.style.display = "none";
      if (morph) morph.classList.add("shown");
      var bl = oc.querySelectorAll(".ord-reveal"); for (var i = 0; i < bl.length; i++) bl[i].classList.add("shown");
      return;
    }
    animateOrderIntro(oc, morph);
  }

  /* ---- ORDER transition-intro (saving → saved → morph into dashboard). ------ */
  function orderIntroHTML() {
    return '<div class="ord-intro" id="ord-intro"><div class="ord-intro-card">' +
      '<div class="ord-intro-icon" id="ord-intro-icon"><span class="ord-spin"></span></div>' +
      '<div class="ord-intro-text" id="ord-intro-text">' + tr(ORDER_INTRO.saving) + "</div>" +
      "</div></div>";
  }
  function animateOrderIntro(container, morph) {
    var intro = container.querySelector(".ord-intro");
    var iconEl = container.querySelector("#ord-intro-icon");
    var textEl = container.querySelector("#ord-intro-text");
    // 1) card fades/scales in once the panel has slid into place.
    later(560, function () { if (intro) intro.classList.add("shown"); });
    // 2) saving → saved: swap spinner for a green check badge, flip the copy.
    later(1450, function () {
      if (iconEl) {
        iconEl.classList.add("done");
        iconEl.innerHTML = '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="11" fill="#12b76a"/>' +
          '<path d="M6.8 12.4l3.3 3.3L17.2 8.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
      if (textEl) { textEl.innerHTML = tr(orderSavedText()); textEl.classList.add("done"); }
    });
    // 3) hold ~1.4s, then cross-fade the card OUT / dashboard IN and build rows.
    later(2850, function () {
      if (intro) intro.classList.add("gone");
      if (morph) { morph.classList.add("shown"); animateOrder(morph); }
    });
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
    var last = blocks.length - 1;
    for (var i = 0; i < blocks.length; i++) (function (b, idx) { later(520 + idx * 170, function () { b.classList.add("shown"); if (idx === last) markFinished(); }); })(blocks[i], i);
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
    // Overlap the fades: the calendar (.bk-fade 0.25s) is nearly transparent by
    // ~200ms, and the confirm card starts fading in then — so the panel body
    // never goes fully blank between the two steps. (DESIGN_DOC_V2 §4/§6)
    later(200, showConfirm);
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
    // Wait for the panel slide+settle (~0.74s) before touching the calendar, then
    // pace the beats with air so nothing "pops". (DESIGN_DOC_V2 §4/§6)
    later(1250, function () { var p = container.querySelector('.bk-day[data-pick="1"]'); if (p) p.classList.add("pick"); });
    later(2150, function () { bookingRevealTimes(container, pickedTime); });
    later(3200, function () { bookingSelectSlot(container, pickedTime); });
    later(4700, function () { bookingGoToConfirm(container); later(1000, markFinished); });
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
  function startPlayback() {
    started = true;
    finished = false;
    run();
  }
  // Full clean replay: used by the ES|EN toggle AND the visibility-restart path.
  function restart() {
    teardown();
    buildStage();
    startPlayback();
  }
  // Visibility-resilient playback (DESIGN_DOC_V3 §1a). Backgrounded tabs throttle
  // timers and pause rAF, freezing the play-once chain; on return we cleanly
  // restart an unfinished play so the viewer always sees a complete run.
  function onVisibility() {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (!started) { startPlayback(); return; }      // deferred at boot (hidden on load)
    if (finished) return;                            // resting end state — never restart
    var hiddenMs = hiddenAt ? (Date.now() - hiddenAt) : 0;
    if (hiddenMs >= 800) restart();                  // ignore quick focus flickers
  }
  function begin() {
    buildStage();
    if (document.hidden) return;                     // defer run() until first visible
    startPlayback();
  }
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
    if (!visBound) { document.addEventListener("visibilitychange", onVisibility); visBound = true; }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", begin, { once: true });
    } else { begin(); }
  }

  global.RCAIDemo = { boot: boot };
})(typeof window !== "undefined" ? window : this);

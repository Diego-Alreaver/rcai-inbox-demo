/*!
 * RCAI chat-kit — shared real-SVG icon kit for the RCAI hero chat-window demos.
 *
 * "Iconos de verdad": every glyph below is a REAL icon-library SVG, not a webfont
 * glyph and not a hand-drawn approximation.
 *   - UI / chrome / status icons  -> Lucide (lucide-static, ISC/MIT, stroke-based, currentColor)
 *   - Brand logos                 -> Simple Icons (CC0). Instagram wears the OFFICIAL
 *                                    IG radial gradient; WhatsApp is the white glyph.
 *
 * On load this script:
 *   1. injects a hidden <svg><defs> holding the Instagram gradient into <body>.
 *   2. defines window.RCAI_ICON(name, opts) -> SVG string  (el.innerHTML = RCAI_ICON('chevron-left'))
 *   3. exposes window.RCAI_ICONS -> sorted array of every available icon name.
 *
 * opts: { size:Number=24, color:String, stroke:Number=2 }
 *   - Lucide icons are stroke-based: color flows via currentColor (set opts.color or a CSS
 *     `color` on the parent). stroke = stroke-width.
 *   - Brand logos keep their own fills: ig-logo = gradient, wa-logo = white,
 *     facebook/messenger = brand color. opts.color still overrides the monochrome ones.
 *
 * Plain ES5/ES6 classic script. No Babel, no build step, no modules.
 */
(function (global) {
  "use strict";

  var GRADIENT_ID = "rcai-ig-gradient";
  var DEFS_ID = "rcai-icon-defs";

  /* ---------------------------------------------------------------------------
   * Hidden <defs> with the official Instagram radial gradient.
   * Stops: #feda75 -> #fa7e1e -> #d62976 -> #962fbf -> #4f5bd5, anchored
   * bottom-left so yellow sits at the corner and blue reaches the far corner.
   * Kept as width/height:0 + overflow:hidden (NOT display:none, which can break
   * gradient resolution in some browsers).
   * ------------------------------------------------------------------------- */
  var DEFS_MARKUP =
    '<svg id="' + DEFS_ID + '" aria-hidden="true" focusable="false" ' +
    'style="position:absolute;width:0;height:0;overflow:hidden" ' +
    'xmlns="http://www.w3.org/2000/svg"><defs>' +
    '<radialGradient id="' + GRADIENT_ID + '" cx="0.32" cy="1" r="1.2" ' +
    'gradientUnits="objectBoundingBox">' +
    '<stop offset="0" stop-color="#feda75"/>' +
    '<stop offset="0.1" stop-color="#feda75"/>' +
    '<stop offset="0.45" stop-color="#fa7e1e"/>' +
    '<stop offset="0.6" stop-color="#d62976"/>' +
    '<stop offset="0.8" stop-color="#962fbf"/>' +
    '<stop offset="1" stop-color="#4f5bd5"/>' +
    "</radialGradient></defs></svg>";

  function injectDefs() {
    if (typeof document === "undefined") return;
    if (document.getElementById(DEFS_ID)) return;
    var host = document.body || document.documentElement;
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = DEFS_MARKUP;
    var node = wrap.firstChild;
    if (node) host.insertBefore(node, host.firstChild);
  }

  /* ---------------------------------------------------------------------------
   * Lucide icon bodies (exact path data from lucide-static v1.22.0).
   * These render inside a stroke="currentColor" fill="none" wrapper.
   * ------------------------------------------------------------------------- */
  var LUCIDE = {
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    phone:
      '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
    video:
      '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    info:
      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    "more-horizontal":
      '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "more-vertical":
      '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    send:
      '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    "send-horizontal":
      '<path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/>',
    mic:
      '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
    camera:
      '<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
    image:
      '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    paperclip:
      '<path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/>',
    smile:
      '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
    sticker:
      '<path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/><path d="M8 13h.01"/><path d="M16 13h.01"/><path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1"/>',
    heart:
      '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
    bookmark:
      '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
    "message-circle":
      '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "check-check":
      '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    signal:
      '<path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/>',
    wifi:
      '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    "battery-full":
      '<path d="M10 10v4"/><path d="M14 10v4"/><path d="M22 14v-4"/><path d="M6 10v4"/><rect x="2" y="6" width="16" height="12" rx="2"/>',
  };

  /* ---------------------------------------------------------------------------
   * Brand logo bodies (exact path data from Simple Icons).
   * ------------------------------------------------------------------------- */
  var BRAND = {
    instagram:
      '<path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>',
    whatsapp:
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
    facebook:
      '<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>',
    messenger:
      '<path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13"/>',
  };

  /* ---------------------------------------------------------------------------
   * Public registry. Each name resolves to a renderer descriptor:
   *   { kind:"stroke", base }          -> Lucide stroke icon (currentColor)
   *   { kind:"fill",   base, color }   -> Lucide path rendered as a solid fill
   *   { kind:"brand",  base }          -> Instagram gradient mark
   *   { kind:"brand",  base, color }   -> monochrome brand logo (default color)
   * `base` is a key into LUCIDE or BRAND.
   * ------------------------------------------------------------------------- */
  var REGISTRY = {
    // --- BRAND -------------------------------------------------------------
    "ig-logo": { kind: "brand", base: "instagram" }, // wears the IG gradient
    "wa-logo": { kind: "brand", base: "whatsapp", color: "#ffffff" }, // white glyph
    "facebook-logo": { kind: "brand", base: "facebook", color: "#1877f2" },
    "messenger-logo": { kind: "brand", base: "messenger", color: "#0084ff" },

    // --- STATUS BAR --------------------------------------------------------
    signal: { kind: "stroke", base: "signal" },
    wifi: { kind: "stroke", base: "wifi" },
    battery: { kind: "stroke", base: "battery-full" },

    // --- CHROME ------------------------------------------------------------
    "chevron-left": { kind: "stroke", base: "chevron-left" },
    phone: { kind: "stroke", base: "phone" },
    video: { kind: "stroke", base: "video" },
    info: { kind: "stroke", base: "info" },
    search: { kind: "stroke", base: "search" },
    "more-h": { kind: "stroke", base: "more-horizontal" },
    "more-v": { kind: "stroke", base: "more-vertical" },

    // --- COMPOSE -----------------------------------------------------------
    send: { kind: "stroke", base: "send" },
    "send-horizontal": { kind: "stroke", base: "send-horizontal" },
    mic: { kind: "stroke", base: "mic" },
    camera: { kind: "stroke", base: "camera" },
    image: { kind: "stroke", base: "image" },
    plus: { kind: "stroke", base: "plus" },
    paperclip: { kind: "stroke", base: "paperclip" },
    emoji: { kind: "stroke", base: "smile" },
    sticker: { kind: "stroke", base: "sticker" },

    // --- INSTAGRAM DM action row ------------------------------------------
    "ig-heart": { kind: "stroke", base: "heart" },
    "ig-comment": { kind: "stroke", base: "message-circle" },
    "ig-share": { kind: "stroke", base: "send" },
    "ig-bookmark": { kind: "stroke", base: "bookmark" },
    "ig-like": { kind: "fill", base: "heart", color: "#ed4956" }, // liked = solid red

    // --- WHATSAPP chrome / compose ----------------------------------------
    "wa-call": { kind: "stroke", base: "phone" },
    "wa-video": { kind: "stroke", base: "video" },
    "wa-send": { kind: "stroke", base: "send-horizontal" },
    "wa-attach": { kind: "stroke", base: "paperclip" },
    "wa-camera": { kind: "stroke", base: "camera" },
    "wa-emoji": { kind: "stroke", base: "smile" },
    check: { kind: "stroke", base: "check" },
    "check-double": { kind: "stroke", base: "check-check" },
  };

  function escAttr(v) {
    return String(v).replace(/"/g, "&quot;");
  }

  function svgOpen(attrs) {
    var s =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"';
    for (var k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      s += " " + k + '="' + escAttr(attrs[k]) + '"';
    }
    return s + ">";
  }

  /**
   * window.RCAI_ICON(name, opts) -> SVG string.
   * opts: { size:Number=24, color:String, stroke:Number=2 }
   */
  function RCAI_ICON(name, opts) {
    opts = opts || {};
    var def = REGISTRY[name];
    if (!def) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("RCAI_ICON: unknown icon name '" + name + "'");
      }
      return "";
    }
    injectDefs();

    var size = opts.size != null ? opts.size : 24;
    var stroke = opts.stroke != null ? opts.stroke : 2;

    if (def.kind === "stroke") {
      var body = LUCIDE[def.base];
      var attrs = {
        width: size,
        height: size,
        fill: "none",
        stroke: "currentColor",
        "stroke-width": stroke,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
        // color drives currentColor; omit to inherit the parent's CSS color
        style: opts.color ? "color:" + opts.color : null,
      };
      return svgOpen(attrs) + body + "</svg>";
    }

    if (def.kind === "fill") {
      var fbody = LUCIDE[def.base];
      var fattrs = {
        width: size,
        height: size,
        fill: opts.color || def.color || "currentColor",
        stroke: "none",
        "aria-hidden": "true",
      };
      return svgOpen(fattrs) + fbody + "</svg>";
    }

    // brand
    var bbody = BRAND[def.base];
    var bfill;
    if (def.base === "instagram" && !opts.color) {
      bfill = "url(#" + GRADIENT_ID + ")";
    } else {
      bfill = opts.color || def.color || "currentColor";
    }
    var battrs = {
      width: size,
      height: size,
      fill: bfill,
      "aria-hidden": "true",
    };
    return svgOpen(battrs) + bbody + "</svg>";
  }

  // Documented, single-source-of-truth list of every available name.
  var NAMES = Object.keys(REGISTRY).sort();

  // Inject the gradient defs as soon as the DOM is ready.
  if (typeof document !== "undefined") {
    if (document.body) {
      injectDefs();
    } else if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", injectDefs);
    }
  }

  global.RCAI_ICON = RCAI_ICON;
  global.RCAI_ICONS = NAMES;
})(typeof window !== "undefined" ? window : this);

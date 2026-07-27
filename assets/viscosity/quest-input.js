/* MOLGANG — headset & gamepad support for the 2D pages.
 *
 * Three features, all self-wiring (pages only include this script):
 *
 * 1. Cinema mode — a 🎬 button appended to <header>. It toggles fullscreen on
 *    the document; the Meta Quest Browser reacts to fullscreen by expanding the
 *    page onto its large curved "cinema" screen, and on desktop it is a normal
 *    fullscreen toggle. No Quest-specific API exists for this — fullscreen IS
 *    the trigger (https://developers.meta.com/horizon/documentation/web/browser-media/).
 *
 * 2. Controller → mouse mapping — Quest Touch controllers (and any standard
 *    gamepad) surface through the Gamepad API in the flat browser, but nothing
 *    maps them to the page. We drive a virtual cursor: one stick moves it,
 *    trigger/A clicks the element under it, the other stick (and the d-pad)
 *    scrolls, B sends Escape. The cursor only appears while a gamepad is
 *    actually being used, so mouse/touch users never see it.
 *
 * 3. Controller menu & options — X / Start / Select (and a 🎮 header button)
 *    open an overlay with quick links to every MOLGANG page plus options:
 *    cursor speed, scroll speed, left/right-handed stick swap and haptic
 *    feedback. Options persist in localStorage ("molgang_gp_opts"). The d-pad
 *    walks the menu, A activates, B closes. Copy is EN/NL following the same
 *    locale the chrome i18n uses ("molgang_locale").
 */
(function () {
  "use strict";
  if (window.MolgangQuestInput) return; // idempotent under double-include
  window.MolgangQuestInput = { version: 2 };

  var isQuest = /OculusBrowser|Quest|Meta/i.test(navigator.userAgent);

  /* ---------- i18n-lite (script is loaded on pages without i18n.js) ---------- */
  function isNL() {
    var saved = "";
    try { saved = (localStorage.getItem("molgang_locale") || "").toLowerCase(); } catch (e) {}
    if (saved) return saved === "nl";
    var l = (document.documentElement.lang || navigator.language || "en").toLowerCase();
    return l.indexOf("nl") === 0;
  }
  var NL = isNL();
  function t(en, nl) { return NL ? nl : en; }

  /* ---------- options (persisted) ---------- */
  var OPTS_KEY = "molgang_gp_opts";
  var MULT = { slow: 0.6, normal: 1, fast: 1.6 };
  var opts = { speed: "normal", scroll: "normal", hand: "right", haptics: true };
  try {
    var stored = JSON.parse(localStorage.getItem(OPTS_KEY) || "{}");
    for (var k in opts) if (stored[k] !== undefined) opts[k] = stored[k];
  } catch (e) {}
  function saveOpts() {
    try { localStorage.setItem(OPTS_KEY, JSON.stringify(opts)); } catch (e) {}
  }
  window.MolgangQuestInput.options = opts;

  /* ---------- haptics ---------- */
  function buzz(pad, ms, mag) {
    if (!opts.haptics || !pad) return;
    try {
      if (pad.vibrationActuator && pad.vibrationActuator.playEffect) {
        pad.vibrationActuator.playEffect("dual-rumble",
          { duration: ms, strongMagnitude: mag, weakMagnitude: mag });
      } else if (pad.hapticActuators && pad.hapticActuators[0]) {
        pad.hapticActuators[0].pulse(mag, ms);
      }
    } catch (e) {}
  }

  /* ---------- 1. Cinema mode ---------- */
  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function toggleCinema() {
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    var root = document.documentElement;
    var req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) req.call(root, { navigationUI: "hide" }).catch(function () {});
  }
  var HEADER_BTN_CSS =
    "background:transparent;border:1px solid #2f4356;color:#89a0b0;" +
    "border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.9em";
  function addHeaderButtons() {
    var header = document.querySelector("header");
    if (!header || document.getElementById("cinema-btn")) return;
    var b = document.createElement("button");
    b.id = "cinema-btn";
    b.className = "ghost help-btn";
    b.title = isQuest
      ? t("Cinema mode — expand onto the Quest theater screen",
          "Cinemamodus — naar het grote Quest-theaterscherm")
      : t("Cinema mode — fullscreen", "Cinemamodus — volledig scherm");
    b.textContent = "🎬 Cinema";
    b.style.cssText = HEADER_BTN_CSS;
    b.addEventListener("click", toggleCinema);
    document.addEventListener("fullscreenchange", function () {
      b.textContent = fsElement() ? t("🎬 Exit cinema", "🎬 Cinema uit") : "🎬 Cinema";
    });
    header.appendChild(b);
    window.MolgangQuestInput.cinemaButton = b;

    var m = document.createElement("button");
    m.id = "gp-menu-btn";
    m.className = "ghost help-btn";
    m.title = t("Controller menu & options (X / Start on the gamepad)",
                "Controllermenu & opties (X / Start op de gamepad)");
    m.textContent = "🎮";
    m.style.cssText = HEADER_BTN_CSS;
    m.addEventListener("click", function () { toggleMenu(); });
    header.appendChild(m);
  }

  /* ---------- 3. Controller menu & options overlay ---------- */
  var PAGES = [
    ["index.html",          "🍺", t("Bar", "Bar")],
    ["dashboard.html",      "📊", t("Dashboard", "Dashboard")],
    ["lab-3d.html",         "🧪", t("3D Lab", "3D-lab")],
    ["lab-analyze.html",    "🔬", t("Analyze Lab", "Analyselab")],
    ["lab-immersive.html",  "🥽", t("Immersive Lab", "Immersief lab")],
    ["viscosity-room.html", "🌀", t("Viscosity Room", "Viscositeitskamer")],
    ["learn.html",          "📖", t("Learn", "Leren")]
  ];
  var OPT_DEFS = [
    { key: "speed",   label: t("Cursor speed", "Cursorsnelheid"),
      values: ["slow", "normal", "fast"],
      names: { slow: t("Slow", "Langzaam"), normal: t("Normal", "Normaal"), fast: t("Fast", "Snel") } },
    { key: "scroll",  label: t("Scroll speed", "Scrollsnelheid"),
      values: ["slow", "normal", "fast"],
      names: { slow: t("Slow", "Langzaam"), normal: t("Normal", "Normaal"), fast: t("Fast", "Snel") } },
    { key: "hand",    label: t("Cursor stick", "Cursorstick"),
      values: ["right", "left"],
      names: { right: t("Right hand", "Rechterhand"), left: t("Left hand", "Linkerhand") } },
    { key: "haptics", label: t("Vibration", "Trillen"),
      values: [true, false],
      names: { "true": t("On", "Aan"), "false": t("Off", "Uit") } }
  ];
  var menu = null, menuOpen = false;

  function injectMenuStyle() {
    if (document.getElementById("gp-menu-style")) return;
    var s = document.createElement("style");
    s.id = "gp-menu-style";
    s.textContent =
      "#gp-menu{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "z-index:99998;width:min(92vw,360px);max-height:86vh;overflow-y:auto;" +
      "background:rgba(11,22,31,.97);border:1px solid #2f4356;border-radius:14px;" +
      "padding:16px 18px;color:#cfe3ee;font-size:.95em;box-shadow:0 12px 40px rgba(0,0,0,.55)}" +
      "#gp-menu h2{margin:0 0 10px;font-size:1.05em;color:#3fb6a8;display:flex;" +
      "justify-content:space-between;align-items:center}" +
      "#gp-menu h3{margin:14px 0 6px;font-size:.8em;text-transform:uppercase;" +
      "letter-spacing:.08em;color:#89a0b0}" +
      "#gp-menu a,#gp-menu button{display:flex;width:100%;align-items:center;gap:8px;" +
      "background:transparent;border:1px solid transparent;border-radius:8px;" +
      "padding:7px 10px;color:#cfe3ee;text-decoration:none;font:inherit;" +
      "cursor:pointer;text-align:left}" +
      "#gp-menu a:hover,#gp-menu button:hover{border-color:#2f4356}" +
      "#gp-menu a:focus,#gp-menu button:focus{outline:2px solid #3fb6a8;outline-offset:-2px}" +
      "#gp-menu a.gp-here{color:#3fb6a8}" +
      "#gp-menu .gp-opt span:first-child{flex:1}" +
      "#gp-menu .gp-opt b{color:#3fb6a8;font-weight:600}" +
      "#gp-menu .gp-legend{margin:12px 0 0;padding:10px 0 0;border-top:1px solid #223444;" +
      "font-size:.8em;color:#89a0b0;line-height:1.7}" +
      "#gp-menu .gp-close{width:auto;padding:2px 9px;border:1px solid #2f4356;" +
      "border-radius:8px;color:#89a0b0}";
    document.head.appendChild(s);
  }

  function currentPage() {
    var p = location.pathname.split("/").pop();
    return p === "" ? "index.html" : p;
  }

  function optButtonText(def) {
    return def.label + ": " + def.names[String(opts[def.key])];
  }
  function cycleOpt(def, btn) {
    var i = def.values.indexOf(opts[def.key]);
    opts[def.key] = def.values[(i + 1) % def.values.length];
    saveOpts();
    btn.innerHTML = "<span>" + def.label + "</span><b>" +
      def.names[String(opts[def.key])] + "</b>";
  }

  function buildMenu() {
    if (menu) return menu;
    injectMenuStyle();
    menu = document.createElement("div");
    menu.id = "gp-menu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", t("Controller menu", "Controllermenu"));

    var h = document.createElement("h2");
    h.textContent = "🎮 " + t("Controller menu", "Controllermenu");
    var close = document.createElement("button");
    close.className = "gp-close";
    close.textContent = "✕";
    close.title = t("Close (B)", "Sluiten (B)");
    close.addEventListener("click", function () { toggleMenu(false); });
    h.appendChild(close);
    menu.appendChild(h);

    var hNav = document.createElement("h3");
    hNav.textContent = t("Go to", "Ga naar");
    menu.appendChild(hNav);
    var here = currentPage();
    PAGES.forEach(function (pg) {
      var a = document.createElement("a");
      a.href = pg[0];
      a.textContent = pg[1] + " " + pg[2];
      if (pg[0] === here) { a.className = "gp-here"; a.textContent += " ←"; }
      menu.appendChild(a);
    });

    var cin = document.createElement("button");
    cin.textContent = "🎬 " + t("Cinema mode", "Cinemamodus");
    cin.addEventListener("click", function () { toggleMenu(false); toggleCinema(); });
    menu.appendChild(cin);

    var hOpt = document.createElement("h3");
    hOpt.textContent = t("Options", "Opties");
    menu.appendChild(hOpt);
    OPT_DEFS.forEach(function (def) {
      var b = document.createElement("button");
      b.className = "gp-opt";
      b.innerHTML = "<span>" + def.label + "</span><b>" +
        def.names[String(opts[def.key])] + "</b>";
      b.title = optButtonText(def);
      b.addEventListener("click", function () { cycleOpt(def, b); });
      menu.appendChild(b);
    });

    var legend = document.createElement("div");
    legend.className = "gp-legend";
    legend.innerHTML = t(
      "<b>A / trigger</b> click · <b>B / grip</b> back · <b>X / Start</b> this menu<br>" +
      "<b>stick</b> cursor · <b>other stick + d-pad</b> scroll",
      "<b>A / trigger</b> klikken · <b>B / grip</b> terug · <b>X / Start</b> dit menu<br>" +
      "<b>stick</b> cursor · <b>andere stick + d-pad</b> scrollen");
    menu.appendChild(legend);

    document.body.appendChild(menu);
    return menu;
  }

  function menuFocusables() {
    return [].slice.call(menu.querySelectorAll("a,button"));
  }
  function moveMenuFocus(step) {
    var items = menuFocusables();
    if (!items.length) return;
    var i = items.indexOf(document.activeElement);
    var next = items[(i + step + items.length) % items.length];
    next.focus();
    if (next.scrollIntoView) next.scrollIntoView({ block: "nearest" });
  }
  function toggleMenu(force) {
    var want = force !== undefined ? force : !menuOpen;
    if (want && !document.body) return;
    if (want) {
      buildMenu();
      menu.style.display = "block";
      menuOpen = true;
      var items = menuFocusables();
      if (items[1]) items[1].focus(); // first nav link, not the ✕
    } else if (menu) {
      menu.style.display = "none";
      menuOpen = false;
      if (menu.contains(document.activeElement)) document.activeElement.blur();
    }
    window.MolgangQuestInput.menuOpen = menuOpen;
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && menuOpen) toggleMenu(false);
  });

  /* ---------- 2. Gamepad → virtual mouse ---------- */
  var cursor = null, cx = 0, cy = 0, lastSeen = 0, rafId = 0, lastT = 0;
  var prevButtons = {}; // per-gamepad-index pressed state for edge detection
  var DEAD = 0.18, SPEED = 1100, SCROLL = 1400, HIDE_AFTER_MS = 4000;

  function ensureCursor() {
    if (cursor) return cursor;
    if (!document.body) return null; // pages load us before <body> parses
    cursor = document.createElement("div");
    cursor.id = "gp-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.style.cssText =
      "position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;" +
      "border:2px solid #3fb6a8;border-radius:50%;background:rgba(63,182,168,.25);" +
      "box-shadow:0 0 10px rgba(63,182,168,.6);pointer-events:none;z-index:99999;" +
      "transition:opacity .3s;opacity:0";
    document.body.appendChild(cursor);
    cx = innerWidth / 2; cy = innerHeight / 2;
    return cursor;
  }
  function axis(v) { return Math.abs(v) > DEAD ? v : 0; }

  function synthesize(type, extra) {
    var el = document.elementFromPoint(cx, cy);
    if (!el) return null;
    var init = Object.assign(
      { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window, button: 0 },
      extra || {});
    el.dispatchEvent(new PointerEvent("pointer" + type, Object.assign({ pointerId: 9001, pointerType: "mouse", isPrimary: true }, init)));
    el.dispatchEvent(new MouseEvent("mouse" + type, init));
    return el;
  }
  function click() {
    var el = synthesize("down");
    synthesize("up");
    if (!el) return;
    var init = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window, button: 0 };
    el.dispatchEvent(new MouseEvent("click", init));
    if (el.focus && (el.tabIndex >= 0 || /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName))) el.focus();
  }

  function scrollPage(dy) {
    var el = document.elementFromPoint(cx, cy);
    var scroller = el;
    while (scroller && scroller !== document.body &&
           scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
    (scroller && scroller !== document.body ? scroller : window).scrollBy(0, dy);
  }

  function poll(t) {
    rafId = requestAnimationFrame(poll);
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
    lastT = t;
    var active = false;
    var speed = SPEED * MULT[opts.speed], scrollSpeed = SCROLL * MULT[opts.scroll];
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p || !p.connected) continue;
      // Standard mapping: left stick = axes 0/1, right stick = axes 2/3. The
      // "hand" option picks which one drives the cursor; the other scrolls.
      // Single-stick pads always cursor with 0/1.
      var twoSticks = p.axes.length > 3;
      var cursorX = 0, cursorY = 1, scrollAx = -1;
      if (twoSticks) {
        if (opts.hand === "left") { cursorX = 0; cursorY = 1; scrollAx = 3; }
        else { cursorX = 2; cursorY = 3; scrollAx = 1; }
      }
      var mx = axis(p.axes[cursorX] || 0);
      var my = axis(p.axes[cursorY] || 0);
      if (twoSticks && !mx && !my && opts.hand === "right") {
        // right-handed default keeps the old fallback: lone left-stick motion
        // still moves the cursor when the right stick is untouched
        mx = axis(p.axes[0] || 0); my = axis(p.axes[1] || 0);
      }
      var sy = scrollAx >= 0 ? axis(p.axes[scrollAx] || 0) : 0;
      if (mx || my || sy) active = true;
      cx = Math.max(0, Math.min(innerWidth, cx + mx * speed * dt));
      cy = Math.max(0, Math.min(innerHeight, cy + my * speed * dt));
      if (sy) scrollPage(sy * scrollSpeed * dt);
      // d-pad up/down (standard 12/13) scrolls too — held, not edge-triggered.
      // While the menu is open the d-pad walks the menu instead (edge cases below).
      if (!menuOpen) {
        if (p.buttons[12] && p.buttons[12].pressed) { scrollPage(-scrollSpeed * dt); active = true; }
        if (p.buttons[13] && p.buttons[13].pressed) { scrollPage(scrollSpeed * dt); active = true; }
      }

      var prev = prevButtons[p.index] || (prevButtons[p.index] = {});
      for (var b = 0; b < p.buttons.length; b++) {
        var down = p.buttons[b].pressed;
        var was = prev[b] || false;
        prev[b] = down;
        if (down === was || !down) { if (down !== was) active = true; continue; }
        active = true;
        switch (b) {
          case 0: // trigger (xr-standard) / A (standard) → activate
            if (menuOpen && menu.contains(document.activeElement)) {
              document.activeElement.click();
            } else {
              click();
            }
            buzz(p, 40, 0.35);
            break;
          case 1: // squeeze / B → close menu, else Escape (close overlays)
            if (menuOpen) toggleMenu(false);
            else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            buzz(p, 30, 0.2);
            break;
          case 2: case 8: case 9: // X / Select / Start → controller menu
            toggleMenu();
            buzz(p, 50, 0.4);
            break;
          case 3: // Y → cinema mode
            toggleCinema();
            buzz(p, 50, 0.4);
            break;
          case 12: if (menuOpen) moveMenuFocus(-1); break; // d-pad ↑ in menu
          case 13: if (menuOpen) moveMenuFocus(1); break;  // d-pad ↓ in menu
        }
      }
    }
    if (active) {
      lastSeen = t;
      if (!ensureCursor()) return;
      cursor.style.opacity = "1";
      cursor.style.left = cx + "px";
      cursor.style.top = cy + "px";
      synthesize("move");
    } else if (cursor && t - lastSeen > HIDE_AFTER_MS) {
      cursor.style.opacity = "0";
    }
  }
  function startPolling() {
    if (!rafId) { lastT = 0; rafId = requestAnimationFrame(poll); }
  }
  window.addEventListener("gamepadconnected", startPolling);
  // Quest fires gamepadconnected only after first input on some builds — if a
  // pad is already attached at load, start straight away.
  if (navigator.getGamepads && [].slice.call(navigator.getGamepads()).some(Boolean)) startPolling();
  // On Quest, poll regardless: controllers can appear without an event.
  if (isQuest) startPolling();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addHeaderButtons);
  } else {
    addHeaderButtons();
  }
})();

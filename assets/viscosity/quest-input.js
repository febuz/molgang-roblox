/* MOLGANG — headset & gamepad support for the 2D pages.
 *
 * Two features, both self-wiring (pages only include this script):
 *
 * 1. Cinema mode — a 🎬 button appended to <header>. It toggles fullscreen on
 *    the document; the Meta Quest Browser reacts to fullscreen by expanding the
 *    page onto its large curved "cinema" screen, and on desktop it is a normal
 *    fullscreen toggle. No Quest-specific API exists for this — fullscreen IS
 *    the trigger (https://developers.meta.com/horizon/documentation/web/browser-media/).
 *
 * 2. Controller → mouse mapping — Quest Touch controllers (and any standard
 *    gamepad) surface through the Gamepad API in the flat browser, but nothing
 *    maps them to the page. We drive a virtual cursor: right stick (or left if
 *    it's the only one) moves it, trigger/A clicks the element under it, left
 *    stick scrolls, B sends Escape. The cursor only appears while a gamepad is
 *    actually being used, so mouse/touch users never see it.
 */
(function () {
  "use strict";
  if (window.MolgangQuestInput) return; // idempotent under double-include
  window.MolgangQuestInput = { version: 1 };

  var isQuest = /OculusBrowser|Quest|Meta/i.test(navigator.userAgent);

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
  function addCinemaButton() {
    var header = document.querySelector("header");
    if (!header || document.getElementById("cinema-btn")) return;
    var b = document.createElement("button");
    b.id = "cinema-btn";
    b.className = "ghost help-btn";
    b.title = isQuest
      ? "Cinema mode — expand onto the Quest theater screen"
      : "Cinema mode — fullscreen";
    b.textContent = "🎬 Cinema";
    b.style.cssText =
      "background:transparent;border:1px solid #2f4356;color:#89a0b0;" +
      "border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.9em";
    b.addEventListener("click", toggleCinema);
    document.addEventListener("fullscreenchange", function () {
      b.textContent = fsElement() ? "🎬 Exit cinema" : "🎬 Cinema";
    });
    header.appendChild(b);
    window.MolgangQuestInput.cinemaButton = b;
  }

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

  function poll(t) {
    rafId = requestAnimationFrame(poll);
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
    lastT = t;
    var active = false;
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p || !p.connected) continue;
      // right stick = axes 2/3 (standard mapping); single-stick pads use 0/1
      var mx = axis(p.axes[2] || 0) || axis(p.axes[0] || 0);
      var my = axis(p.axes[3] || 0) || axis(p.axes[1] || 0);
      // left stick vertical scrolls when the right stick exists separately
      var sy = p.axes.length > 3 ? axis(p.axes[1] || 0) : 0;
      if (mx || my || sy) active = true;
      cx = Math.max(0, Math.min(innerWidth, cx + mx * SPEED * dt));
      cy = Math.max(0, Math.min(innerHeight, cy + my * SPEED * dt));
      if (sy) {
        var el = document.elementFromPoint(cx, cy);
        var scroller = el;
        while (scroller && scroller !== document.body &&
               scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
        (scroller && scroller !== document.body ? scroller : window)
          .scrollBy(0, sy * SCROLL * dt);
      }
      var prev = prevButtons[p.index] || (prevButtons[p.index] = {});
      for (var b = 0; b < p.buttons.length; b++) {
        var down = p.buttons[b].pressed;
        var was = prev[b] || false;
        prev[b] = down;
        if (down === was) continue;
        active = true;
        // 0 = trigger (xr-standard) / A (standard) → click on press
        if (b === 0 && down) click();
        // 1 = squeeze / B → Escape (close overlays)
        if (b === 1 && down) {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
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
    document.addEventListener("DOMContentLoaded", addCinemaButton);
  } else {
    addCinemaButton();
  }
})();

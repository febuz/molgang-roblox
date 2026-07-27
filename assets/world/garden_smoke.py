#!/usr/bin/env python3
"""Moleculia grounding + garden browser smoke (Playwright, headless).

Two things introduced in the same session, verified together:

1. Grounding: the world used to float in a starfield void; it now grounds
   on the real steel-plant terrain the player picked on steelworks.html
   (localStorage 'molgang.site' / ?site=<id>), falling back to Tata Steel
   IJmuiden ('c0') on a cold start. Guards against regressing back to the
   space void (background color 0x07070f) or losing the site handoff.

2. The garden: a personal 6-plot bed is the walkable front end for the
   game's REAL element -> Fertilizer Lab -> crop economy (crops[],
   fertInv, fertById in world.js, ported from the Roblox Lua source) —
   NOT a second invented crop/fertiliser economy. Guards specifically
   against that regression: garden pedestals must be the real 5 crops,
   fertilising must spend real synthesized fertInv stock (not a coin
   purchase), and harvest must pay via the same growthDays*100*health
   formula the pre-existing single-plot Farm uses.

Requires a built bundle at ../../deploy/molgang (run build_deploy.sh
first). Exit 0 = pass.

Run:  bash build_deploy.sh && python3 assets/world/garden_smoke.py
"""
from __future__ import annotations

import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]        # molgang-roblox/
BUNDLE = ROOT / "deploy" / "molgang"
EXPECTED_CROPS = ["wheat", "tomato", "rice", "grape", "phytoremediation"]
EXPECTED_PH = {
    "wheat": [6.0, 7.5], "tomato": [6.0, 6.8], "rice": [5.5, 6.5],
    "grape": [5.5, 6.5], "phytoremediation": [4.0, 6.0],
}


def main() -> int:
    if not (BUNDLE / "world" / "world.js").exists():
        print(f"[skip] no bundle at {BUNDLE} -- run build_deploy.sh first")
        return 0
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler, directory=str(BUNDLE))
    handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    failures: list[str] = []
    check = lambda ok, msg: (print(f"  {'✓' if ok else '✗ FAIL:'} {msg}"),
                             failures.append(msg) if not ok else None)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--use-angle=swiftshader"])

        # -- steelworks: choosing a site persists it for the world to read --
        p = browser.new_page(viewport={"width": 1280, "height": 800})
        errs: list[str] = []
        p.on("pageerror", lambda e: errs.append(str(e)))
        p.goto(f"http://127.0.0.1:{port}/steelworks/", wait_until="domcontentloaded")
        p.wait_for_function("window.__steel !== undefined", timeout=15000)
        p.evaluate("window.__steel.ready")
        p.wait_for_timeout(1800)
        saved = p.evaluate("JSON.parse(localStorage.getItem('molgang.site'))")
        check(not errs, f"steelworks: no console/page errors ({errs[:2]})")
        check(bool(saved and saved.get("id")),
              f"steelworks: site persisted to localStorage ({saved})")
        p.close()

        # -- world: cold start (no localStorage) still grounds, never the void --
        p2 = browser.new_page(viewport={"width": 1280, "height": 800})
        errs2: list[str] = []
        p2.on("pageerror", lambda e: errs2.append(str(e)))
        p2.goto(f"http://127.0.0.1:{port}/world/?tp=0,0,0", wait_until="domcontentloaded")
        p2.wait_for_function("window.__molgangWorld !== undefined", timeout=20000)
        p2.wait_for_timeout(2500)
        mw = p2.evaluate("window.__molgangWorld")
        check(bool(mw.get("groundedSite")),
              f"world: cold start grounds on a real site ({mw.get('groundedSite')})")
        check(mw.get("groundColor") != "07070f",
              f"world: ground is not the space void ({mw.get('groundColor')})")
        check(not errs2, f"world: no console/page errors on cold start ({errs2[:2]})")
        p2.close()

        # -- world: real ?site= deep link grounds on that EXACT site --
        p3 = browser.new_page(viewport={"width": 1280, "height": 800})
        errs3: list[str] = []
        p3.on("pageerror", lambda e: errs3.append(str(e)))
        site_id = saved["id"] if saved else "c0"
        p3.goto(f"http://127.0.0.1:{port}/world/?tp=0,0,0&site={site_id}",
               wait_until="domcontentloaded")
        p3.wait_for_function("window.__molgangWorld !== undefined", timeout=20000)
        p3.wait_for_timeout(2500)
        mw2 = p3.evaluate("window.__molgangWorld")
        check(mw2.get("groundedSite") == (saved or {}).get("name", mw2.get("groundedSite")),
              f"world: ?site= deep link grounds on the chosen site ({mw2.get('groundedSite')})")
        p3.close()

        # -- garden: real elements->fertilizer economy, no duplicate one --
        p4 = browser.new_page(viewport={"width": 1280, "height": 800})
        errs4: list[str] = []
        p4.on("pageerror", lambda e: errs4.append(str(e)))
        p4.goto(f"http://127.0.0.1:{port}/world/?tp=14,28,0&stockfert=1",
               wait_until="domcontentloaded")
        p4.wait_for_function("window.__garden !== undefined", timeout=20000)
        p4.wait_for_timeout(3000)
        check(not errs4, f"garden: no console/page errors ({errs4[:2]})")

        crops = p4.evaluate("window.__garden.crops.map(c => c.id)")
        check(crops == EXPECTED_CROPS,
              f"garden pedestals are the game's real crops, not invented ones ({crops})")
        ph = {c: r for c, r in p4.evaluate(
            "window.__garden.crops.map(c => [c.id, c.idealPH])")}
        check(ph == EXPECTED_PH,
              f"canary: idealPH unchanged since plan-time (PLOT_PH still covers all) ({ph})")

        inv0 = p4.evaluate("Object.assign({}, window.__garden.fertInv)")
        check(inv0.get("urea", 0) > 0,
              f"?stockfert=1 seeded real fertInv (urea={inv0.get('urea')})")

        # Exact pedestal world position: tools = 5 crops + water + fertilize
        # + harvest (8), px = -0.55*(8-1) + i*1.1; wheat is i=0 -> px=-3.85.
        # Garden group offset (14, 0, 24) -> sign at (10.15, 1.15, 26.6).
        hit = p4.evaluate("window.__inspect(10.15, 3.0, 26.6, 0, -1, 0)")
        check(bool(hit and "Wheat" in str(hit)),
              f"click/trigger ray finds the real Wheat pedestal ({hit})")

        r0 = p4.evaluate("window.__garden.activate('tool:wheat')")
        check("120-40-40" in r0, f"selecting a crop shows its real idealNPK ({r0})")
        r1 = p4.evaluate("window.__garden.activate('plot:0')")
        check("✅" in r1, f"sowing is free, no coin cost ({r1})")

        starved = p4.evaluate("window.__garden.fastForward(1200)")[0]
        check(len(starved["symptoms"]) >= 1,
              f"unfed plot shows real deficiency symptoms ({starved['symptoms']})")

        before = p4.evaluate("Object.assign({}, window.__garden.fertInv)")
        r2 = p4.evaluate(
            "(() => { const a = window.__garden.activate; a('tool:fertilize');"
            " const r = a('plot:0'); a('tool:water'); a('plot:0'); return r; })()")
        after = p4.evaluate("Object.assign({}, window.__garden.fertInv)")
        spent = sum(before.get(k, 0) - after.get(k, 0) for k in before)
        check(spent >= 1,
              f"fertilising SPENDS real synthesized fertInv, no coin purchase "
              f"({r2} | spent={spent})")

        for _ in range(6):
            p4.evaluate(
                "(() => { const a = window.__garden.activate; a('tool:water');"
                " a('plot:0'); a('tool:fertilize'); a('plot:0');"
                " window.__garden.fastForward(1500); })()")
            if p4.evaluate("window.__garden.garden.plots[0].growth") >= 0.95:
                break
        grown = p4.evaluate("window.__garden.garden.plots[0].growth")
        check(grown >= 0.95,
              f"sustained real fertilising grows a crop to maturity ({grown})")

        mc0 = p4.evaluate(
            "JSON.parse(localStorage.getItem('molgang.molcoins')) ?? 20000")
        p4.evaluate("window.__garden.activate('tool:harvest')")
        rh = p4.evaluate("window.__garden.activate('plot:0')")
        mc1 = p4.evaluate(
            "JSON.parse(localStorage.getItem('molgang.molcoins')) ?? 20000")
        check("✅" in rh and mc1 > mc0,
              f"harvest pays MolCoins via growthDays*100*health "
              f"({rh}, {mc0}->{mc1})")

        p4.evaluate("window.__garden.activate('tool:phytoremediation')")
        p4.evaluate("window.__garden.activate('plot:3')")
        st3 = p4.evaluate("window.__garden.fastForward(1500)")[3]
        check("ph" in st3["symptoms"],
              f"wrong-soil-pH plot shows the ph symptom (fills the real gap "
              f"where idealPH was parsed but never used) ({st3['symptoms']})")

        p4.close()
        browser.close()
    srv.shutdown()
    print(f"\n{'PASS' if not failures else f'{len(failures)} FAILURES'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

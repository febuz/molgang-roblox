#!/usr/bin/env python3
"""
smoke_test.py — protect the 3D asset viewer + model library from drift.

Checks, in order (any failure exits non-zero):
  1. manifest.json is in sync with assets/models/*.glb (no missing entries,
     no dangling entries).
  2. every GLB is a valid, non-trivial binary glTF (magic 'glTF', > 1 KB).
  3. the viewer actually loads all of them: serve assets/ and headless-load
     the page, asserting the HUD reports "<n>/<n> models loaded" with n ==
     the manifest count.

Step 3 is skipped (with a warning, not a failure) if no headless Chromium is
found, so the data checks still run in a minimal environment.

Usage:  python3 assets/viewer/smoke_test.py
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS = os.path.join(ROOT, "assets", "models")
VIEWER = os.path.join(ROOT, "assets", "viewer")
MANIFEST = os.path.join(VIEWER, "manifest.json")
PORT = 8097

CHROMIUM_CANDIDATES = ["/snap/bin/chromium", "chromium", "chromium-browser",
                       "google-chrome", "google-chrome-stable"]


def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)


def check_manifest_sync():
    if not os.path.exists(MANIFEST):
        fail("manifest.json missing — run build_manifest.py")
    manifest = json.load(open(MANIFEST))
    listed = {m["file"] for m in manifest["models"]}
    on_disk = {os.path.basename(p) for p in glob.glob(os.path.join(MODELS, "*.glb"))}
    missing = on_disk - listed        # GLBs on disk not in manifest
    dangling = listed - on_disk       # manifest entries with no file
    if missing:
        fail(f"{len(missing)} GLB(s) on disk not in manifest (run build_manifest.py): {sorted(missing)[:5]}")
    if dangling:
        fail(f"{len(dangling)} manifest ent(y/ies) with no GLB file: {sorted(dangling)[:5]}")
    if manifest["count"] != len(listed):
        fail(f"manifest count {manifest['count']} != {len(listed)} entries")
    print(f"OK  manifest in sync — {len(listed)} models")
    return len(listed)


def check_glb_validity():
    bad = []
    for p in glob.glob(os.path.join(MODELS, "*.glb")):
        try:
            with open(p, "rb") as f:
                magic = f.read(4)
            size = os.path.getsize(p)
            if magic != b"glTF" or size < 1024:
                bad.append((os.path.basename(p), magic, size))
        except OSError as e:
            bad.append((os.path.basename(p), repr(e), 0))
    if bad:
        fail(f"{len(bad)} invalid GLB(s): {bad[:5]}")
    print(f"OK  all GLBs are valid binary glTF (>1 KB)")


def check_viewer_loads(expected):
    chromium = next((c for c in CHROMIUM_CANDIDATES if shutil.which(c) or os.path.exists(c)), None)
    if not chromium:
        print("WARN  no headless Chromium found — skipping the live-load check")
        return
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                              cwd=os.path.join(ROOT, "assets"),
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(2)
        url = f"http://localhost:{PORT}/viewer/index.html"
        out = subprocess.run(
            [chromium, "--headless=new", "--no-sandbox", "--use-gl=swiftshader",
             "--enable-unsafe-swiftshader", "--virtual-time-budget=20000",
             "--run-all-compositor-stages-before-draw", "--dump-dom", url],
            capture_output=True, text=True, timeout=90).stdout
        m = re.search(r"(\d+)/(\d+) models loaded", out)
        if not m:
            fail("viewer never reported a 'N/N models loaded' status")
        loaded, total = int(m.group(1)), int(m.group(2))
        if loaded != total:
            fail(f"viewer loaded only {loaded}/{total} models")
        if total != expected:
            fail(f"viewer total {total} != manifest count {expected}")
        print(f"OK  viewer loaded {loaded}/{total} models in a real browser")
    finally:
        server.terminate()


def main():
    print("== MOLGANG asset viewer smoke test ==")
    n = check_manifest_sync()
    check_glb_validity()
    check_viewer_loads(n)
    print("PASS")


if __name__ == "__main__":
    main()

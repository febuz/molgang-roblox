#!/usr/bin/env python3
"""Fetch curated CC0 Poly Haven models: FBX (+textures) into the repo's
assets/fbx_library/{slug}/, glTF (+bin+textures) into ph_gltf/{slug}/ for
packing to GLB. 1k res keeps the streamed bundle lean."""
import json, os, urllib.request, sys

SLUGS = ["chemistry_set","bunsen_burner","propane_tank","small_lpg_tank",
         "metal_jerrycan","metal_toolbox","korean_fire_extinguisher_01",
         "modular_industrial_pipes_01","Barrel_01","barrel_03",
         "caged_hanging_light","portable_generator","ladder_sectioned_01","cement_bag"]
FBX_DIR = "/home/knight2/molgang-roblox/assets/fbx_library"
GLTF_DIR = os.path.abspath("ph_gltf")

def get(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0: return 0
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) molgang-asset-fetch"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f: f.write(r.read())
    return os.path.getsize(dest)

total = 0
for slug in SLUGS:
    try:
        req = urllib.request.Request(f"https://api.polyhaven.com/files/{slug}", headers={"User-Agent": "Mozilla/5.0 molgang"})
        d = json.load(urllib.request.urlopen(req, timeout=30))
        for fmt, root in (("fbx", FBX_DIR), ("gltf", GLTF_DIR)):
            if fmt not in d or "1k" not in d[fmt]: print(f"  {slug}: no {fmt}/1k"); continue
            entry = d[fmt]["1k"][fmt]
            main = os.path.join(root, slug, os.path.basename(entry["url"]))
            total += get(entry["url"], main)
            for rel, inc in entry.get("include", {}).items():
                total += get(inc["url"], os.path.join(root, slug, rel))
        print(f"  ok {slug}")
    except Exception as e:
        print(f"  FAIL {slug}: {e}")
print(f"downloaded ~{total/1e6:.1f} MB new")

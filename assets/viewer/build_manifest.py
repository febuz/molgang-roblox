#!/usr/bin/env python3
"""Regenerate assets/viewer/manifest.json from the .glb files in assets/models.

The browser viewer fetches this manifest, so run it after adding new GLB
models:  python3 assets/viewer/build_manifest.py
"""
import json
import os
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS = os.path.join(ROOT, "assets", "models")

CAFE = {"cafe_counter", "boba_brewing_station", "cafe_bar_stool", "cafe_bistro_table",
        "cafe_menu_board", "tapioca_pearl_jar", "drink_display_fridge", "cafe_planter"}
LAB = {"molecule_model", "bunsen_burner", "test_tube_rack", "fume_hood",
       "periodic_table_display", "graduated_cylinder", "microscope", "reagent_shelf"}
HUB = {"welcome_arch", "directory_signpost", "nexus_fountain", "plaza_bench",
       "info_kiosk", "lamp_post", "holo_map_stand", "banner_pole"}
MINING = {"ore_cart", "mine_support_frame", "ore_vein", "pickaxe_rack",
          "mine_rail", "mine_lantern", "crate_stack", "ore_pile"}


def set_of(stem):
    if stem in CAFE:
        return "Bubble Tea Café"
    if stem in LAB:
        return "Chemistry Lab"
    if stem in HUB:
        return "Nexus Hub"
    if stem in MINING:
        return "Mining Site"
    return "Industrial & Game"


def main():
    models = sorted(os.path.basename(p) for p in glob.glob(os.path.join(MODELS, "*.glb")))
    entries = [{
        "file": m,
        "stem": m[:-4],
        "label": m[:-4].replace("_", " ").title(),
        "set": set_of(m[:-4]),
    } for m in models]
    out = os.path.join(ROOT, "assets", "viewer", "manifest.json")
    with open(out, "w") as f:
        json.dump({"generated_by": "assets/viewer/build_manifest.py",
                   "count": len(entries), "models": entries}, f, indent=2)
    print(f"Wrote {out} ({len(entries)} GLB models)")


if __name__ == "__main__":
    main()

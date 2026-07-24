#!/usr/bin/env python3
"""
moleculia_gen.py — build the ACTUAL MOLGANG world ("Moleculia") for the web,
grounded in the Roblox game's goals + vision instead of a generic city.

MOLGANG is a Chemical Engineering Simulator: a floating archipelago in space
with 6 zones, whose core loop is the Slakkenspoor factory processing BOF steel
slag through 12 real stations under real process kinetics (see process_sim.py,
ported from ProcessEngineering.lua). This emits moleculia.json — 6 floating
platform zones, the Slakkenspoor processing LINE laid out with the game's real
equipment GLBs and conveyors, and each zone's landmark assets.

Reuses the engine (streaming renderer, WebXR, the process sim); only the world
CONTENT changes from "GTA city" to the real Moleculia. Run:
  python3 assets/world/moleculia_gen.py
"""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "moleculia.json")

# Zones as floating platforms in a ring (the archipelago), centre = Nexus Hub.
ZONES = {
    "Nexus Hub":            {"x": 0,    "z": 0,    "r": 34, "landmarks": ["welcome_arch", "nexus_fountain", "directory_signpost", "info_kiosk", "holo_map_stand"]},
    "Periodic Table Biome": {"x": 0,    "z": -120, "r": 40, "landmarks": ["periodic_table_display", "molecule_model", "beaker_1L", "erlenmeyer_flask", "reagent_shelf"]},
    "Quantum Lab":          {"x": 120,  "z": 0,    "r": 36, "landmarks": ["quantum_tunnel_ring", "quantum_dot", "hero_shield_generator", "microscope", "fume_hood"]},
    "Slakkenspoor Fabriek": {"x": -140, "z": 0,    "r": 60, "landmarks": []},   # the hero zone — the processing line
    "MolChain Tower":       {"x": 95,   "z": -95,  "r": 30, "landmarks": ["distillation_column", "storage_silo", "diploma_frame"]},
    "ANK Kredietunie":      {"x": -95,  "z": -95,  "r": 30, "landmarks": ["victory_trophy", "diploma_frame", "plaza_bench", "cafe_counter"]},
}

# The real 12-station BOF slag processing chain (SteelSlag.ProcessingStations),
# in order, mapped to the equipment GLBs we have.
PROCESS_LINE = [
    ("Slag Cooling Pit", "cooling_pit.glb"),
    ("Vibrating Feeder", "screw_conveyor.glb"),
    ("Jaw Crusher", "jaw_crusher.glb"),
    ("Vibrating Screen", "vibrating_screen.glb"),
    ("Cone Crusher", "cone_crusher.glb"),
    ("Ball Mill", "ball_mill.glb"),
    ("HGMS Magnetic Separator", "magnetic_separator.glb"),
    ("Roasting Kiln", "roasting_kiln.glb"),
    ("Leaching Tank", "leaching_tank.glb"),
    ("Filtration Press", "filtration_press.glb"),
    ("Precipitation Reactor", "thickener_tank.glb"),
    ("Drying Oven", "spray_dryer.glb"),
]


def build():
    objs = []
    zmeta = []

    def add(t, ref, x, z, r=0.0, s=6.0, extra=None):
        o = {"t": t, "ref": ref, "x": round(x, 2), "z": round(z, 2), "r": round(r, 3), "s": round(s, 2)}
        if extra:
            o.update(extra)
        objs.append(o)

    for name, z in ZONES.items():
        cx, cz, rad = z["x"], z["z"], z["r"]
        zmeta.append({"name": name, "x": cx, "z": cz, "r": rad})
        add("platform", name, cx, cz, 0, rad)          # floating platform disc

        if name == "Slakkenspoor Fabriek":
            # Lay the 12-station line across the platform; conveyor between each.
            n = len(PROCESS_LINE)
            span = rad * 1.6
            for i, (label, glb) in enumerate(PROCESS_LINE):
                sx = cx - span / 2 + span * (i / (n - 1))
                sz = cz + (8 if i % 2 == 0 else -8)     # zig-zag the line
                add("asset", glb, sx, sz, (i % 2) * math.pi, 8, {"station": label, "step": i + 1})
                if i < n - 1:
                    nx = cx - span / 2 + span * ((i + 1) / (n - 1))
                    mx, mz = (sx + nx) / 2, cz
                    add("asset", "conveyor_belt.glb", mx, mz, math.pi / 2, 5)
            # a couple of silos + a slag ladle for flavour
            add("asset", "storage_silo.glb", cx + span / 2 + 6, cz + 12, 0, 12)
            add("asset", "slag_ladle.glb", cx - span / 2 - 6, cz - 10, 0, 6)
        else:
            lms = z["landmarks"]
            for j, lm in enumerate(lms):
                ang = j * 2 * math.pi / max(len(lms), 1)
                lx = cx + math.cos(ang) * rad * 0.5
                lz = cz + math.sin(ang) * rad * 0.5
                big = any(k in lm for k in ("column", "silo", "tower", "arch", "fountain", "tunnel"))
                add("asset", lm + (".glb" if not lm.endswith(".glb") else ""), lx, lz, ang, 12 if big else 6)

    world = {
        "meta": {"world": 460, "space": True, "zones": zmeta,
                 "processLine": [p[0] for p in PROCESS_LINE],
                 "vision": "MOLGANG — Chemical Engineering Simulator (Moleculia archipelago)"},
        "objects": objs,
    }
    json.dump(world, open(OUT, "w"))
    na = sum(1 for o in objs if o["t"] == "asset")
    print(f"[moleculia] {len(objs)} objects ({na} equipment/landmark models, "
          f"{len(ZONES)} floating zones, {len(PROCESS_LINE)}-station Slakkenspoor line) -> {OUT}")


if __name__ == "__main__":
    build()

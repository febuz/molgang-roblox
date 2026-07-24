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
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "moleculia.json")
ELEMENTS_LUA = os.path.join(HERE, "..", "..", "game", "src", "ReplicatedStorage", "Data", "Elements.lua")
FERTILIZER_LUA = os.path.join(HERE, "..", "..", "game", "src", "ReplicatedStorage", "Modules", "FertilizerTrack.lua")


FACTORY_LUA = os.path.join(HERE, "..", "..", "game", "src", "ReplicatedStorage", "Modules", "FactoryEquipment.lua")


def parse_equipment():
    """Extract the factory equipment catalog + floor config from FactoryEquipment.lua
    (real data: cost, power, category, colour, and the adjacency bonuses that make
    factory layout a real optimisation puzzle)."""
    try:
        txt = open(FACTORY_LUA, encoding="utf-8").read()
    except OSError:
        return [], {}
    start = txt.find("FactoryEquipment.Items")
    end = txt.find("FactoryEquipment.FloorConfig")
    section = txt[start:end] if start >= 0 and end > start else ""
    ids = list(re.finditer(r"id\s*=\s*['\"]([^'\"]*)['\"]", section))
    items = []
    for i, m in enumerate(ids):
        block = section[m.start(): ids[i + 1].start() if i + 1 < len(ids) else len(section)]
        cat = re.search(r"category\s*=\s*['\"]([^'\"]*)['\"]", block)
        cost = re.search(r"cost\s*=\s*(\d+)", block)
        pw = re.search(r"powerKW\s*=\s*(\d+)", block)
        nm = re.search(r"name\s*=\s*['\"]([^'\"]*)['\"]", block)
        col = re.search(r"Color3\.fromRGB\((\d+),\s*(\d+),\s*(\d+)\)", block)
        adj_m = re.search(r"adjacencyBonus\s*=\s*\{([^}]*)\}", block)
        adj = {}
        if adj_m:
            adj = {k: float(v) for k, v in re.findall(r"(\w+)\s*=\s*([\d.]+)", adj_m.group(1))}
        items.append({
            "id": m.group(1), "name": nm.group(1) if nm else m.group(1),
            "category": cat.group(1) if cat else "Other",
            "cost": int(cost.group(1)) if cost else 0,
            "powerKW": int(pw.group(1)) if pw else 0,
            "rgb": [int(col.group(1)), int(col.group(2)), int(col.group(3))] if col else [150, 160, 175],
            "adjacency": adj,
        })
    fc = {}
    fcm = re.search(r"FactoryEquipment\.FloorConfig\s*=\s*\{([^}]*)\}", txt)
    if fcm:
        for k, v in re.findall(r"(\w+)\s*=\s*(\d+)", fcm.group(1)):
            fc[k] = int(v)
    return items, fc


def parse_crops():
    """Extract the crops (real ideal NPK + pH + growth days) from FertilizerTrack.lua.
    Used for Liebig's-Law farming: yield is limited by the scarcest nutrient."""
    try:
        txt = open(FERTILIZER_LUA, encoding="utf-8").read()
    except OSError:
        return []
    # only the Crops table section (entries carry idealNPK)
    start = txt.find("FertilizerTrack.Crops")
    if start < 0:
        return []
    section = txt[start:]
    end = section.find("FertilizerTrack.StoryQuests")
    if end > 0:
        section = section[:end]
    ids = list(re.finditer(r"id\s*=\s*['\"]([^'\"]*)['\"]", section))
    out = []
    for i, m in enumerate(ids):
        block = section[m.start(): ids[i + 1].start() if i + 1 < len(ids) else len(section)]
        npk = re.search(r"idealNPK\s*=\s*\{(\d+),\s*(\d+),\s*(\d+)\}", block)
        if not npk:
            continue
        ph = re.search(r"idealPH\s*=\s*\{([\d.]+),\s*([\d.]+)\}", block)
        gd = re.search(r"growthDays\s*=\s*(\d+)", block)
        nm = re.search(r"name\s*=\s*['\"]([^'\"]*)['\"]", block)
        out.append({
            "id": m.group(1), "name": nm.group(1) if nm else m.group(1),
            "idealNPK": [int(npk.group(1)), int(npk.group(2)), int(npk.group(3))],
            "idealPH": [float(ph.group(1)), float(ph.group(2))] if ph else [5.5, 7.0],
            "growthDays": int(gd.group(1)) if gd else 5,
        })
    return out


def parse_fertilizers():
    """Extract the 10 fertilizers from the game's FertilizerTrack.lua (real data:
    name, formula, NPK, and the atom recipe that links them to element collection)."""
    try:
        txt = open(FERTILIZER_LUA, encoding="utf-8").read()
    except OSError:
        return []
    ids = list(re.finditer(r"id\s*=\s*['\"]([^'\"]*)['\"]", txt))
    out = []
    for i, m in enumerate(ids):
        block = txt[m.start(): ids[i + 1].start() if i + 1 < len(ids) else len(txt)]
        npk = re.search(r"npk\s*=\s*\{(\d+),\s*(\d+),\s*(\d+)\}", block)
        atoms_m = re.search(r"atoms\s*=\s*\{([^}]*)\}", block)
        if not (npk and atoms_m):
            continue                      # soils/crops have no atom recipe — skip
        atoms = {a: int(n) for a, n in re.findall(r"(\w+)\s*=\s*(\d+)", atoms_m.group(1))}
        col = re.search(r"Color3\.fromRGB\((\d+),\s*(\d+),\s*(\d+)\)", block)
        name_m = re.search(r"name\s*=\s*['\"]([^'\"]*)['\"]", block)
        formula_m = re.search(r"formula\s*=\s*['\"]([^'\"]*)['\"]", block)
        out.append({
            "id": m.group(1),
            "name": name_m.group(1) if name_m else m.group(1),
            "formula": formula_m.group(1) if formula_m else "",
            "npk": [int(npk.group(1)), int(npk.group(2)), int(npk.group(3))],
            "atoms": atoms,
            "rgb": [int(col.group(1)), int(col.group(2)), int(col.group(3))] if col else [180, 200, 160],
        })
    return out


def parse_elements():
    """Extract the 118 elements from the Roblox game's Elements.lua (real data:
    symbol, atomic number, group, period, colour, one educational fact)."""
    try:
        txt = open(ELEMENTS_LUA, encoding="utf-8").read()
    except OSError:
        return []
    out = []
    for m in re.finditer(r"\[(\d+)\]\s*=\s*\{(.*?)\n\s*\}", txt, re.DOTALL):
        num, body = int(m.group(1)), m.group(2)
        def g(pat, d=None):
            mm = re.search(pat, body)
            return mm.group(1) if mm else d
        sym = g(r"sym='([^']*)'")
        if not sym:
            continue
        col = re.search(r"Color3\.fromRGB\((\d+),\s*(\d+),\s*(\d+)\)", body)
        out.append({
            "num": num, "sym": sym, "name": g(r"name='([^']*)'", sym),
            "grp": int(g(r"group=(\d+)", 0)), "per": int(g(r"period=(\d+)", 0)),
            "rgb": [int(col.group(1)), int(col.group(2)), int(col.group(3))] if col else [180, 190, 210],
            "fact": g(r"facts=\{'([^']*)'", ""),
        })
    return out


def periodic_cell(num, grp, per):
    """(col, row) in a standard periodic-table layout; lanthanides/actinides on
    two rows below the main table so all 118 read as the real chart."""
    if 57 <= num <= 71:                 # lanthanides
        return 3 + (num - 57), 9
    if 89 <= num <= 103:                # actinides
        return 3 + (num - 89), 10
    return grp, per

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
        elif name == "Periodic Table Biome":
            # Collectible element tiles laid out as a real periodic table. Landmarks
            # ring the edge; the 118 elements fill the centre as a walkable chart.
            lms = z["landmarks"]
            for j, lm in enumerate(lms):
                ang = j * 2 * math.pi / max(len(lms), 1)
                add("asset", lm + (".glb" if not lm.endswith(".glb") else ""),
                    cx + math.cos(ang) * rad * 0.92, cz + math.sin(ang) * rad * 0.92, ang, 6)
            els = parse_elements()
            dx, dz = 2.55, 2.7                      # cell spacing
            for e in els:
                col, row = periodic_cell(e["num"], e["grp"], e["per"])
                ex = cx + (col - 9.5) * dx           # groups 1..18 across x
                ez = cz + (row - 5.0) * dz           # periods top->bottom across z
                add("element", e["sym"], ex, ez, 0, 1.9,
                    {"num": e["num"], "name": e["name"], "rgb": e["rgb"],
                     "grp": e["grp"], "per": e["per"], "fact": e["fact"]})
        else:
            lms = z["landmarks"]
            for j, lm in enumerate(lms):
                ang = j * 2 * math.pi / max(len(lms), 1)
                lx = cx + math.cos(ang) * rad * 0.5
                lz = cz + math.sin(ang) * rad * 0.5
                big = any(k in lm for k in ("column", "silo", "tower", "arch", "fountain", "tunnel"))
                add("asset", lm + (".glb" if not lm.endswith(".glb") else ""), lx, lz, ang, 12 if big else 6)

    fertilizers = parse_fertilizers()
    crops = parse_crops()
    equipment, floor = parse_equipment()
    world = {
        "meta": {"world": 460, "space": True, "zones": zmeta,
                 "processLine": [p[0] for p in PROCESS_LINE],
                 "fertilizers": fertilizers, "crops": crops,
                 "equipment": equipment, "floorConfig": floor,
                 "vision": "MOLGANG — Chemical Engineering Simulator (Moleculia archipelago)"},
        "objects": objs,
    }
    json.dump(world, open(OUT, "w"))
    na = sum(1 for o in objs if o["t"] == "asset")
    print(f"[moleculia] {len(objs)} objects ({na} equipment/landmark models, "
          f"{len(ZONES)} floating zones, {len(PROCESS_LINE)}-station Slakkenspoor line) -> {OUT}")


if __name__ == "__main__":
    build()

#!/usr/bin/env python3
"""
world_gen.py — build the game map in Python (EVE-Online-style: the world is
authored/owned server-side in Python; the browser is a thin renderer that just
draws the precomputed map). Emits world.json.

Doing the layout here (not in JS at load) means the client starts instantly on
a "ready-made map" and spends no time computing placements — it only streams
in what's near the camera. Learns from open-source game practice: a data-driven
map (OpenRA), and distance-streaming so a dense city stays cheap (GTA/Quake).

Resolver: each thing the district needs is word-matched against the identified
GLB library (assets/models via assets/viewer/manifest.json). A hit -> a real 3D
model ("identified"); a miss -> a Stable-Diffusion impostor ("unidentified").

Run:  python3 assets/world/world_gen.py
"""
import json
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, "..", "viewer", "manifest.json")
IMPOSTORS = os.path.join(HERE, "impostors", "impostors.json")
OUT = os.path.join(HERE, "world.json")

WORLD, BLOCK, ROAD, SEED = 240, 60, 14, 1337
GRID = [-1, 0, 1]


def load():
    manifest = json.load(open(MANIFEST))
    impostors = json.load(open(IMPOSTORS))["impostors"]
    stems = [{"stem": m["stem"], "file": m["file"], "set": m["set"]} for m in manifest["models"]]
    return stems, impostors, manifest


def words(s):
    return [w for w in ''.join(c if c.isalnum() else ' ' for c in s.lower()).split() if w]


def make_resolver(stems, impostors):
    def resolve(keywords, impostor_type):
        for a in stems:
            w = words(a["stem"])
            if any(k in w for k in keywords):
                return ("asset", a["file"], a["stem"])
        if impostor_type and impostor_type in impostors:
            return ("imp", impostor_type, impostor_type)
        return None
    return resolve


# Each block gets a themed cluster of identified assets (grouped by set).
SET_BLOCKS = {
    (-1, -1): "Chemistry Lab", (0, -1): "Industrial & Game", (1, -1): "Mining Site",
    (-1, 0): "Industrial & Game", (0, 0): "Nexus Hub", (1, 0): "Industrial & Game",
    (-1, 1): "Bubble Tea Café", (0, 1): "Industrial & Game", (1, 1): "Mining Site",
}
BIG = ("silo column tower tank converter kiln excavator truck frame arch "
       "fountain fridge crane distillation vessel").split()

# role, keywords (to match a real model), impostor fallback, size, spacing.
NEEDS = [
    ("street light", ["lamp", "light"], None, 5, 22),
    ("bench", ["bench"], None, 4, 34),
    ("signpost", ["signpost"], None, 5, 48),
    ("tree", ["tree"], "tree", 7, 15),
    ("palm tree", ["zzz"], "palm_tree", 8, 30),
    ("car", ["sedan", "vehicle"], "car", 3.4, 17),
    ("delivery truck", ["zzz"], "delivery_truck", 4.5, 40),
    ("van", ["zzz"], "van", 4, 46),
    ("city bus", ["zzz"], "city_bus", 6, 74),
    ("motorcycle", ["zzz"], "motorcycle", 2.6, 36),
    ("pedestrian", ["pedestrian", "person"], "pedestrian", 3.4, 18),
    ("worker", ["zzz"], "worker", 3.4, 32),
    ("woman", ["zzz"], "woman_pedestrian", 3.4, 28),
    ("fire hydrant", ["hydrant"], "fire_hydrant", 1.6, 30),
    ("dumpster", ["dumpster"], "dumpster", 2.6, 42),
    ("traffic cone", ["zzcone"], "traffic_cone", 1.3, 24),
    ("shrub", ["shrub", "bush"], "shrub", 2.2, 14),
    ("mailbox", ["zzz"], "mailbox", 2.4, 54),
    ("phone booth", ["zzz"], "phone_booth", 3.2, 62),
    ("food cart", ["zzz"], "food_cart", 3, 68),
    ("planter", ["zzz"], "planter_box", 2.4, 38),
    ("road barrier", ["zzz"], "road_barrier", 3, 26),
]


def build():
    stems, impostors, manifest = load()
    resolve = make_resolver(stems, impostors)
    rng = random.Random(SEED)
    objs = []
    road_ats = [g * (BLOCK + ROAD) for g in GRID]
    resolve_report = {}

    def add(t, ref, x, z, r, s):
        objs.append({"t": t, "ref": ref, "x": round(x, 2), "z": round(z, 2),
                     "r": round(r, 3), "s": round(s, 2)})

    # 1. Per-block landmark clusters from the identified library.
    by_set = {}
    for m in manifest["models"]:
        by_set.setdefault(m["set"], []).append(m)
    for gx in GRID:
        for gz in GRID:
            cx, cz = gx * (BLOCK + ROAD), gz * (BLOCK + ROAD)
            group = by_set.get(SET_BLOCKS[(gx, gz)], [])[:9]
            for i, m in enumerate(group):
                col, row = i % 3, i // 3
                x = cx + (col - 1) * 15 + (rng.random() - 0.5) * 4
                z = cz + (row - 1) * 15 + (rng.random() - 0.5) * 4
                big = any(k in m["stem"] for k in BIG)
                add("asset", m["file"], x, z, rng.random() * math.tau, 12 if big else 6)

    # 2. Building facades line the streets (gap -> impostor).
    for at in road_ats:
        t = -WORLD / 2 + 20
        while t < WORLD / 2 - 20:
            if abs(t) >= ROAD:
                add("imp", "factory_facade", t, at - ROAD / 2 - 3, 0, 16)
                add("imp", "factory_facade", t, at + ROAD / 2 + 3, math.pi, 16)
                add("imp", "factory_facade", at - ROAD / 2 - 3, t, math.pi / 2, 16)
                add("imp", "factory_facade", at + ROAD / 2 + 3, t, -math.pi / 2, 16)
            t += 22

    # 3. Street furniture + fill along the roads (resolver decides model vs diffusion).
    for role, kw, imp, size, every in NEEDS:
        r = resolve(kw, imp)
        resolve_report[role] = r[0] if r else "none"
        if not r:
            continue
        for at in road_ats:
            t = -WORLD / 2 + 16
            while t < WORLD / 2 - 16:
                if abs(t) >= ROAD:
                    for (x, z) in ((t, at - ROAD / 2 - 1.5), (t, at + ROAD / 2 + 1.5),
                                   (at - ROAD / 2 - 1.5, t), (at + ROAD / 2 + 1.5, t)):
                        if rng.random() <= 0.6:
                            add(r[0], r[1], x, z, rng.random() * math.tau, size)
                t += every

    # 4. Tall landmarks over the blocks (gap -> impostor).
    for gx in GRID:
        for gz in GRID:
            cx, cz = gx * (BLOCK + ROAD), gz * (BLOCK + ROAD)
            if (gx + gz) % 2 == 0:
                add("imp", "crane", cx + 18, cz + 18, rng.random() * math.pi, 26)
            else:
                add("imp", "water_tower", cx - 18, cz - 18, 0, 16)
    for sx in (-1, 1):
        for sz in (-1, 1):
            add("imp", "power_pylon", sx * (WORLD / 2 - 12), sz * (WORLD / 2 - 12), rng.random() * math.pi, 20)

    n_asset = sum(1 for o in objs if o["t"] == "asset")
    n_imp = len(objs) - n_asset
    world = {
        "meta": {"world": WORLD, "block": BLOCK, "road": ROAD, "seed": SEED,
                 "roadAts": road_ats, "assets": n_asset, "impostors": n_imp},
        "resolve": resolve_report,
        "objects": objs,
    }
    json.dump(world, open(OUT, "w"))
    print(f"[world_gen] {len(objs)} objects ({n_asset} identified models, "
          f"{n_imp} diffusion impostors) -> {OUT}")


if __name__ == "__main__":
    build()

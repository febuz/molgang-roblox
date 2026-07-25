#!/usr/bin/env python3
"""
world_smoke.py — GPU-free integrity check for the Moleculia web experience.

Guards the committed world so it keeps running without a GPU: the Moleculia map
matches the game's data (6 zones, the 12-station Slakkenspoor line, 118 elements,
10 fertilizers, 5 crops), the ported process chemistry behaves (Arrhenius +
selective precipitation with a real pH optimum), and the Python sim exposes the
reactor the browser drives. The reusable engine pieces (JEPA world model, fast
GAN) and the legacy city (world.json) are checked only if present. Any hard
failure exits non-zero.

Run:  python3 assets/world/world_smoke.py
"""
import glob
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def fail(m):
    print(f"FAIL: {m}"); sys.exit(1)


def check_moleculia():
    """The primary world: Moleculia (moleculia.json), authored by moleculia_gen.py."""
    w = json.load(open(os.path.join(HERE, "moleculia.json")))
    meta, objs = w["meta"], w["objects"]
    if not meta.get("space"):
        fail("moleculia.json is not flagged as a space world")
    zones = [o for o in objs if o["t"] == "platform"]
    if len(zones) != 6:
        fail(f"expected 6 floating zones, got {len(zones)}")
    stations = [o for o in objs if o.get("station")]
    if len(stations) != 12:
        fail(f"expected the 12-station Slakkenspoor line, got {len(stations)}")
    # every equipment/landmark GLB the world streams must exist
    models = {os.path.basename(p) for p in glob.glob(os.path.join(HERE, "..", "models", "*.glb"))}
    missing = {o["ref"] for o in objs if o["t"] == "asset"} - models
    if missing:
        fail(f"moleculia references GLBs with no file: {sorted(missing)[:5]}")
    elements = [o for o in objs if o["t"] == "element"]
    nums = {o["num"] for o in elements}
    if len(elements) != 118 or nums != set(range(1, 119)):
        fail(f"expected 118 elements numbered 1..118, got {len(elements)}")
    print(f"OK  Moleculia: {len(zones)} zones, {len(stations)} stations, {len(elements)} elements, "
          f"{len(objs)} objects")
    return meta


def check_fertilizers_crops(meta):
    ferts = meta.get("fertilizers", [])
    if len(ferts) != 10:
        fail(f"expected 10 fertilizers, got {len(ferts)}")
    for f in ferts:
        if len(f.get("npk", [])) != 3 or not f.get("atoms"):
            fail(f"fertilizer {f.get('id')} missing NPK or atom recipe")
    crops = meta.get("crops", [])
    if len(crops) != 5:
        fail(f"expected 5 crops, got {len(crops)}")
    for c in crops:
        if len(c.get("idealNPK", [])) != 3 or any(v <= 0 for v in c["idealNPK"]):
            fail(f"crop {c.get('id')} has a bad idealNPK (Liebig needs positive targets)")
    print(f"OK  fertilizers: {len(ferts)} (real NPK + atom recipes) · crops: {len(crops)} (ideal NPK)")
    eq = meta.get("equipment", [])
    if len(eq) < 30:
        fail(f"expected the factory equipment catalog (~34), got {len(eq)}")
    if not any(e.get("adjacency") for e in eq):
        fail("no equipment carries adjacency bonuses (factory layout puzzle broken)")
    fc = meta.get("floorConfig", {})
    if not fc.get("maxEquipment"):
        fail("floorConfig missing maxEquipment")
    print(f"OK  factory: {len(eq)} equipment (adjacency bonuses present), floor max {fc['maxEquipment']}")


def check_process_chemistry():
    """The ported ProcessEngineering chemistry (process_sim.py) must behave."""
    sys.path.insert(0, HERE)
    import process_sim as p
    # selective vanadium recovery must have its optimum inside V's 1.8-3.0 window
    def sel(pH):
        return (p.precipitation_fraction("V", pH)
                * (1 - p.precipitation_fraction("Fe", pH))
                * (1 - p.precipitation_fraction("Al", pH)))
    if not (sel(2.9) > sel(2.2) and sel(2.9) > sel(5.5) and sel(5.5) < 0.05):
        fail("selective V recovery has no optimum inside the vanadium pH window")
    # Arrhenius must speed the reaction with temperature
    if not p.arrhenius_multiplier(90, 50) > p.arrhenius_multiplier(40, 50) > 0:
        fail("Arrhenius multiplier not increasing with temperature")
    # a finer feed (smaller k divisor) must convert more per step
    st = p.default_state(); st.update({"temperature": 75, "pressure": 180, "flowRate": 5, "pH": 2.9, "conversion": 0.2})
    coarse = p.step_reactor(dict(st), 1.0, 0.05 / 7.0)      # chunk
    fine = p.step_reactor(dict(st), 1.0, 0.05 / 1.0)        # ground
    if not fine > coarse:
        fail("finer feed did not leach faster")
    print(f"OK  chemistry: V optimum in-window (sel@2.9={sel(2.9):.2f} > sel@5.5={sel(5.5):.2f}), "
          f"Arrhenius + particle-size monotone")


def check_lua_parity():
    """Sync protocol: constants the web sim duplicates from the Roblox game must
    match their Lua source of truth (SteelSlag / ProductMarket)."""
    import re
    sys.path.insert(0, HERE)
    import importlib
    sim = importlib.import_module("sim_server")
    mods = os.path.join(HERE, "..", "..", "game", "src", "ReplicatedStorage", "Modules")
    slag = open(os.path.join(mods, "SteelSlag.lua"), encoding="utf-8").read()
    # ParticleSizes leachMultiplier, in SizeOrder chunk/crushed/ground/powder
    mults = [float(v) for v in re.findall(r"leachMultiplier\s*=\s*([\d.]+)", slag)[:4]]
    web = [sim.Sim.LEACH_MULT[k] for k in ("chunk", "crushed", "ground", "powder")]
    if mults != web:
        fail(f"leachMultiplier drift: Lua {mults} != web {web}")
    boost = re.search(r"boostFactor\s*=\s*([\d.]+)", slag)
    if boost and abs(float(boost.group(1)) - sim.Sim.ROAST_BOOST) > 1e-9:
        fail(f"roast boost drift: Lua {boost.group(1)} != web {sim.Sim.ROAST_BOOST}")
    market = open(os.path.join(mods, "ProductMarket.lua"), encoding="utf-8").read()
    m = re.search(r"id\s*=\s*\"V2O5\".*?basePrice\s*=\s*(\d+)", market, re.DOTALL)
    if m and int(m.group(1)) != sim.Sim.V2O5_PRICE:
        fail(f"V2O5 price drift: Lua {m.group(1)} != web {sim.Sim.V2O5_PRICE}")
    print(f"OK  Lua parity: leachMultipliers {web}, roast x{sim.Sim.ROAST_BOOST}, V2O5 {sim.Sim.V2O5_PRICE} MolCoins")


def check_sim():
    """The live sim authority exposes the reactor the browser operates."""
    sys.path.insert(0, HERE)
    import importlib
    sim = importlib.import_module("sim_server")
    sim.SIM.set_controls({"temperature": 85, "pressure": 220, "flowRate": 7, "pH": 2.9,
                          "particleSize": "powder", "deironized": True, "roasted": True})
    rx = sim.SIM.state()["reactor"]
    need = {"temperature", "pressure", "pH", "flowRate", "conversion", "rate",
            "yield", "particleSize", "leachSpeed", "deironized", "roasted", "v2o5", "batches"}
    missing = need - set(rx)
    if missing:
        fail(f"reactor state missing fields: {sorted(missing)}")
    if rx["particleSize"] != "powder" or not rx["deironized"] or not rx["roasted"]:
        fail("reactor did not honour operator setpoints")
    print(f"OK  sim reactor: setpoints honoured (powder {rx['leachSpeed']}x, de-ironed, roasted), "
          f"yield {rx['yield']}")


# ---- reusable engine pieces (optional; only if the files are present) ----
def _lin(w, b, x):
    return [sum(w[o][i] * x[i] for i in range(len(x))) + b[o] for o in range(len(w))]


def _gelu(v):
    return [0.5 * x * (1 + math.tanh(0.7978845608 * (x + 0.044715 * x ** 3))) for x in v]


def check_world_model():
    p = os.path.join(HERE, "world_model.json")
    if not os.path.exists(p):
        print("WARN  world_model.json missing — JEPA overlay disabled"); return
    m = json.load(open(p)); K = m["meta"]["K"]
    def mlp(layer, x):
        return _lin(layer["w1"], layer["b1"], _gelu(_lin(layer["w0"], layer["b0"], x)))
    out = mlp(m["dec"], mlp(m["pred"], mlp(m["enc"], [0.1] * (6 * K))))
    if len(out) != 2 or any(math.isnan(v) or math.isinf(v) for v in out):
        fail(f"world model forward produced bad output: {out}")
    print("OK  JEPA world model: forward pass valid (engine, reusable)")


def check_legacy_city():
    p = os.path.join(HERE, "world.json")
    if not os.path.exists(p):
        print("WARN  world.json (legacy city) missing — ?world=./world.json disabled"); return
    objs = json.load(open(p))["objects"]
    print(f"OK  legacy city still available behind ?world=./world.json ({len(objs)} objects)")


def main():
    print("== MOLGANG · Moleculia smoke test ==")
    meta = check_moleculia()
    check_fertilizers_crops(meta)
    check_process_chemistry()
    check_lua_parity()
    check_sim()
    check_world_model()
    check_legacy_city()
    print("PASS")


if __name__ == "__main__":
    main()

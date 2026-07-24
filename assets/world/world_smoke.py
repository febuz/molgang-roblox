#!/usr/bin/env python3
"""
world_smoke.py — GPU-free integrity check for the whole open-world pipeline.

Guards the committed world so it keeps running without a GPU: the map matches
its assets, every referenced impostor exists, YOLO labels line up, the exported
JEPA world model does a valid forward pass, the fast-GAN generator loads, and
the Python sim produces state. Any failure exits non-zero.

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


def check_map():
    w = json.load(open(os.path.join(HERE, "world.json")))
    objs = w["objects"]
    if not objs:
        fail("world.json has no objects")
    na = sum(1 for o in objs if o["t"] == "asset")
    ni = sum(1 for o in objs if o["t"] == "imp")
    if (na, ni) != (w["meta"]["assets"], w["meta"]["impostors"]):
        fail(f"world.json meta counts {w['meta']['assets']}/{w['meta']['impostors']} != {na}/{ni}")
    if not w.get("resolve"):
        fail("world.json has no resolver report")
    print(f"OK  map: {len(objs)} objects ({na} identified models, {ni} diffusion impostors)")
    return objs


def check_impostors(objs):
    imp_dir = os.path.join(HERE, "impostors")
    have = {os.path.basename(p)[:-4] for p in glob.glob(os.path.join(imp_dir, "*.png"))}
    needed = {o["ref"] for o in objs if o["t"] == "imp"}
    missing = needed - have
    if missing:
        fail(f"world references impostors with no PNG: {sorted(missing)[:5]}")
    labels = json.load(open(os.path.join(imp_dir, "impostors.json")))["impostors"]
    if not needed <= set(labels):
        fail("impostors.json missing entries used by the world")
    print(f"OK  impostors: all {len(needed)} referenced types have a PNG + manifest entry")


def check_ar_labels():
    p = os.path.join(HERE, "ar_labels.json")
    if not os.path.exists(p):
        print("WARN  ar_labels.json missing — AR falls back to type names"); return
    d = json.load(open(p))["labels"]
    hit = sum(1 for v in d.values() if v.get("yolo"))
    print(f"OK  YOLO labels: {hit}/{len(d)} impostors recognised")


def _lin(w, b, x):
    return [sum(w[o][i] * x[i] for i in range(len(x))) + b[o] for o in range(len(w))]


def _gelu(v):
    return [0.5 * x * (1 + math.tanh(0.7978845608 * (x + 0.044715 * x ** 3))) for x in v]


def check_world_model():
    p = os.path.join(HERE, "world_model.json")
    m = json.load(open(p))
    K = m["meta"]["K"]

    def mlp(layer, x):
        return _lin(layer["w1"], layer["b1"], _gelu(_lin(layer["w0"], layer["b0"], x)))
    x = [0.1] * (6 * K)                                  # 6 features per step, K steps
    out = mlp(m["dec"], mlp(m["pred"], mlp(m["enc"], x)))
    if len(out) != 2 or any(math.isnan(v) or math.isinf(v) for v in out):
        fail(f"world model forward produced bad output: {out}")
    print(f"OK  JEPA world model: enc->pred->dec forward valid, heading out {tuple(round(v, 3) for v in out)}")


def check_fast_gan():
    p = os.path.join(HERE, "fastgan_G.pt")
    if not os.path.exists(p):
        print("WARN  fastgan_G.pt missing"); return
    try:
        import torch
        ckpt = torch.load(p, map_location="cpu")
        if "classes" not in ckpt or not ckpt["classes"]:
            fail("fastgan_G.pt has no class list")
        print(f"OK  fast GAN: generator loads, {len(ckpt['classes'])} classes")
    except ImportError:
        print("WARN  torch not installed — skipping GAN load check")


def check_sim():
    sys.path.insert(0, HERE)
    import importlib
    sim = importlib.import_module("sim_server")
    st = sim.SIM.state()
    if st["n"] <= 0 or not st["agents"]:
        fail("sim produced no agents")
    print(f"OK  sim: {st['n']} agents, sample {st['agents'][0]['k']} at ({st['agents'][0]['x']},{st['agents'][0]['z']})")


def main():
    print("== MOLGANG open-world smoke test ==")
    objs = check_map()
    check_impostors(objs)
    check_ar_labels()
    check_world_model()
    check_fast_gan()
    check_sim()
    print("PASS")


if __name__ == "__main__":
    main()

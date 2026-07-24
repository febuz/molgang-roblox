#!/usr/bin/env python3
"""
generate_impostors.py — diffusion gap-fill for the game world.

The world is composed from the identified asset library (assets/models/*.glb,
listed in assets/viewer/manifest.json). Object types the library does NOT
cover — the "unidentified" objects — are generated here as impostor billboards
via a diffusion model (Stable Diffusion Turbo), background-knocked-out to a
transparent PNG, and cached by prompt hash. The browser world places these as
camera-facing sprites where no real model exists.

Provenance (prompt + model + seed) is written to impostors.json so the world
is reproducible and the generation is auditable. Generated PNGs are committed,
so the world renders without a GPU; only regenerating needs one.

Run (needs the GPU + `pip install --user --break-system-packages diffusers==0.31.0 transformers accelerate`):
  python3 assets/world/generate_impostors.py
"""
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "impostors")
MANIFEST = os.path.join(OUT_DIR, "impostors.json")
MODEL = "stabilityai/sd-turbo"
STYLE = ("low-poly stylized game asset, isometric view, centered, cutout, "
         "isolated on a solid magenta background, no ground, no floor, "
         "no shadow, no text")

# The "gap" object types an industrial/factory open-world district needs that
# the chemistry/industrial/café/mining library does NOT already provide.
# (Things it DOES provide — lamp posts, benches, signposts, tanks, silos,
# fences — are resolved to real GLB models by the browser resolver instead.)
GAPS = {
    "tree": "a single lone pine tree",
    "car": "a single parked stylized sedan car, side view",
    "pedestrian": "a single standing person character, front view",
    "fire_hydrant": "a single red fire hydrant",
    "shipping_container": "a single steel shipping cargo container",
    "factory_facade": "a large industrial factory building facade with windows and a chimney",
    "billboard_sign": "a tall blank advertising billboard on a pole",
    "dumpster": "a single green metal dumpster bin",
    "bus_stop": "a single bus stop shelter with a bench",
    "power_pylon": "a single tall electricity transmission pylon tower",
    "shrub": "a single round green bush shrub",
    "traffic_cone": "a single orange traffic cone",
}


def knockout_background(img):
    """Key out the magenta green-screen background. Subjects are asked to sit
    on a solid magenta field (no game object here is magenta), so a global
    colour key is reliable — no dependence on the subject being colourful or
    the background being uniform grey. A border flood-fill mops up any residual
    magenta-ish fringe. Returns a transparent RGBA image."""
    from PIL import Image, ImageDraw
    import numpy as np
    rgb = img.convert("RGB")
    w, h = rgb.size
    arr = np.array(rgb).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Hue-based magenta key: catches every magenta/pink shade (light fringe
    # included) without touching red (hue~0), green or grey. Magenta hue ~300°.
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    sat = np.where(mx > 0, chroma / np.maximum(mx, 1), 0)
    # hue in degrees, only meaningful where chroma > 0
    hue = np.zeros_like(r)
    m_r = (mx == r) & (chroma > 0)
    m_g = (mx == g) & (chroma > 0)
    m_b = (mx == b) & (chroma > 0)
    hue[m_r] = (60 * ((g - b) / np.maximum(chroma, 1)))[m_r] % 360
    hue[m_g] = (60 * ((b - r) / np.maximum(chroma, 1)) + 120)[m_g]
    hue[m_b] = (60 * ((r - g) / np.maximum(chroma, 1)) + 240)[m_b]
    magenta = (hue > 270) & (hue < 345) & (sat > 0.12)
    # Also flood from the border to catch anti-aliased fringe.
    keyimg = rgb.copy()
    seeds = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2),
             (w // 2, 1), (w // 2, h - 2), (1, h // 2), (w - 2, h // 2)]
    for s in seeds:
        ImageDraw.floodfill(keyimg, s, (255, 0, 255), thresh=50)
    karr = np.array(keyimg)
    flooded = (karr[:, :, 0] == 255) & (karr[:, :, 1] == 0) & (karr[:, :, 2] == 255)
    alpha = np.where(magenta | flooded, 0, 255).astype(np.uint8)
    out = np.dstack([np.array(rgb), alpha])
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def main():
    import torch
    from diffusers import AutoPipelineForText2Image

    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"[load] {MODEL} ...", flush=True)
    pipe = AutoPipelineForText2Image.from_pretrained(
        MODEL, torch_dtype=torch.float16, variant="fp16", safety_checker=None).to("cuda")

    entries = {}
    for gap_type, subject in GAPS.items():
        prompt = f"{subject}, {STYLE}"
        seed = int(hashlib.sha1(prompt.encode()).hexdigest()[:8], 16)
        fname = f"{gap_type}.png"
        fpath = os.path.join(OUT_DIR, fname)
        entries[gap_type] = {"file": fname, "prompt": prompt, "model": MODEL, "seed": seed}
        if os.path.exists(fpath):
            print(f"[skip] {gap_type} (cached)", flush=True)
            continue
        gen = torch.Generator(device="cuda").manual_seed(seed)
        img = pipe(prompt, num_inference_steps=3, guidance_scale=0.0,
                   height=512, width=512, generator=gen).images[0]
        img = knockout_background(img)
        img.save(fpath)
        print(f"[gen] {gap_type} -> {fname}", flush=True)

    with open(MANIFEST, "w") as f:
        json.dump({"model": MODEL, "style": STYLE, "count": len(entries),
                   "impostors": entries}, f, indent=2)
    print(f"[done] {len(entries)} impostors -> {MANIFEST}")


if __name__ == "__main__":
    sys.exit(main())

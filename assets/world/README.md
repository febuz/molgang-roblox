# MOLGANG Open World

A free-roam, first-person industrial-district world in the browser, built by
composing the **identified asset library** (`assets/models/*.glb`) with
**diffusion-generated impostors** for object types the library doesn't cover.

## The idea

The district needs streets, buildings, cars, trees, people, street furniture.
For each need the resolver (`world.js`) word-matches the GLB manifest:

- **hit → a real model is placed** (e.g. street light → `lamp_post`, bench →
  `plaza_bench`, silo → `storage_silo`, fountain → `nexus_fountain`, arch →
  `welcome_arch`). These are the *identified* objects — the district's real
  landmarks and machinery.
- **miss → a diffusion impostor billboard** (e.g. tree, car, pedestrian,
  factory facade, fire hydrant, power pylon). These are the *unidentified*
  objects, filled by Stable Diffusion Turbo — see `impostors/` and
  `generate_impostors.py`.

The HUD shows the live split (identified → models vs unidentified → diffusion)
and a per-role legend.

## Run

```bash
assets/viewer/serve.sh        # serves assets/ on :8090
# then open http://localhost:8090/world/
```

Controls: **click** to capture the mouse (look around), **WASD** to move.
`?cam=street|overview|plaza` deep-links a fixed viewpoint.

## Verified vs. needs-your-browser

Composition is verified by headless-Chromium screenshots (street + overview):
all models load, the resolver splits correctly, and the diffusion impostors
render cleanly. **Free-roam movement + pointer-lock mouse-look are NOT
machine-verifiable here** (they need real keyboard/mouse input) — try them in
your browser.

## Regenerating the diffusion fills

Needs a GPU + `pip install --user --break-system-packages diffusers==0.31.0
transformers accelerate safetensors`, then `python3 assets/world/generate_impostors.py`.
The PNGs are committed, so the world runs without a GPU.

# MOLGANG Open World

A free-roam, first-person browser world that is **composed from the identified
asset library and filled in by generative AI where the library falls short** —
with an AR overlay, a live Python simulation, shared-world multiplayer, and a
learned predictive world model. Built to be GPU-thin (49% render budget +
instancing + streaming) and Python-heavy (the world is authored and simulated
server-side; the browser is a thin client).

## Run it

```bash
# 1. static world (map + streaming renderer + diffusion impostors + AR)
assets/viewer/serve.sh                       # serves assets/ on http://localhost:8090
#    open http://localhost:8090/world/        (add ?ar=1 for the AR glasses)

# 2. living world (moving traffic + pedestrians + multiplayer) — optional
python3 assets/world/sim_server.py           # EVE-style sim authority on :8077
```

Controls: **click** to capture the mouse, **W** forward / **S** back / **A**/**D**
strafe / **Shift** sprint. `?cam=street|overview|plaza` deep-links a viewpoint;
`?ar=1` starts with the AR overlay; the 🥽 button toggles it.

## Architecture (data flows top→bottom)

| Layer | File | What it does |
|---|---|---|
| **Map authoring** | `world_gen.py` → `world.json` | Python precomputes the whole district (roads, block clusters, street furniture) so the client does no layout work. Resolver word-matches each need to the GLB library — hit = real model, miss = diffusion impostor. |
| **Diffusion gap-fill** | `generate_impostors.py` → `impostors/` | Stable-Diffusion-Turbo generates billboard impostors for object types the library lacks (cars, trees, people, facades…), magenta-keyed to transparent. |
| **Fast GAN** | `fast_gan.py` → `fastgan_G.pt` | A class-conditional GAN distilled from the diffusion seeds — real-time (~30000× faster) per-class impostor generation for the hot path. |
| **Detection / labels** | `ar_label.py` → `ar_labels.json` | YOLOv9 re-identifies each diffusion impostor (car/person/hydrant…) for the AR overlay. |
| **Renderer** | `world.js` + `index.html` | Thin client: instant sky+ground, then streams only nearby GLB models and draws all impostors as **instanced** billboards (~26 draw calls). 49% render-budget loop. |
| **AR overlay** | `world.js` (`?ar=1`) | Labels everything in view — identified models (cyan), diffusion (amber), YOLO-recognised incl. live traffic (green), other players (pink) — plus JEPA predicted trajectories. |
| **Live simulation** | `sim_server.py` (:8077) | EVE-Online-style Python authority: 64 agents (traffic + pedestrians) ticked at 20 Hz; tiny JSON state polled by the client. Also holds the multiplayer player roster (`/join`). |
| **World model** | `world_model.py` → `world_model.json` | LeCun **JEPA** predictive world model: learns the traffic dynamics (turns at intersections) in latent space; 34% better 2s-ahead than a constant-velocity baseline. Runs in-browser (plain-JS forward pass) to draw predicted trajectories. |
| **P2P asset layer** | `world.js` + optional `ipfs.json` | If an `ipfs.json` (gateway + CIDs) is present, models/impostors load from IPFS (peer-to-peer) with a local fallback. |

## Regenerating the AI pieces (needs a GPU)

```bash
pip install --user --break-system-packages diffusers==0.31.0 transformers accelerate ultralytics
python3 assets/world/generate_impostors.py   # diffusion impostors
python3 assets/world/ar_label.py             # YOLOv9 labels
python3 assets/world/fast_gan.py             # class-conditional fast GAN
python3 assets/world/world_model.py          # JEPA world model (CPU)
python3 assets/world/world_gen.py            # rebuild the map (CPU)
python3 assets/world/world_smoke.py          # validate the whole pipeline
```

Committed outputs (`world.json`, `impostors/`, `world_model.json`,
`fastgan_G.pt`, `ar_labels.json`) mean the world runs with **no GPU** — only
regenerating needs one.

## Verified vs. needs-your-browser

Composition, AR overlay, instancing, live sim, multiplayer and world-model
trajectories are all verified by real-browser screenshots. Free-roam movement
+ pointer-lock mouse-look need real keyboard/mouse input to feel out.

## Honest scope

The impostors are billboards (camera-facing, shadow-grounded) — a stylised
2.5D fill, not full 3D. The fast GAN is class-correct but impressionistic at
64×64/160 seeds (more seeds + resolution → production quality). The JEPA model
learns a deliberately simple sim rule; richer dynamics are the natural next
step.

# MOLGANG 3D Asset Viewer

Browser gallery for the generated GLB assets (`assets/models/*.glb`), with an
**opt-in GPU acceleration** setting — mirroring the WebGL/WebGPU split in
molgang-web/lab3d and Alexander's "GPU 0 for browser/WebGL, opt in before
heavy GPU use" policy.

## Run

```bash
assets/viewer/serve.sh          # serves assets/ on http://localhost:8090
# then open http://localhost:8090/viewer/
```

A static server is required — browsers block `file://` fetch of the GLB and
manifest.

## GPU opt-in

The **⚡ GPU acceleration (opt-in)** checkbox is **off by default**, so the
viewer stays light on a shared box:

| Setting | Renderer | Power hint | Render budget |
|---|---|---|---|
| Off (default) | WebGL (`index.html`) | `low-power` | 33% duty cycle |
| On + WebGPU browser | WebGPU (`gpu.html`) | `high-performance` | 90% |
| On, no WebGPU | WebGL (`index.html`) | `high-performance` | 90% |

Flipping the toggle persists the choice (`localStorage`) and reloads; the page
routes to the matching renderer (a WebGL/WebGPU power preference can't change
live). The HUD shows the active renderer and the detected GPU string.

## Navigation

Models are grouped by their manifest `set` (Bubble Tea Café / Chemistry Lab /
Nexus Hub / Mining Site / Industrial & Game). Each group renders as a
contiguous block under a floating colour-keyed label, and the HUD legend has a
per-set checkbox to show/hide that group.

**🏷 Show model names** (HUD toggle, off by default) floats each model's name
above it — the way to tell 80 look-alike low-poly shapes apart. Deep-link with
`?names=1` to start with names on. Name labels respect the per-set filter.

## Adding models

Drop new `.glb` files in `assets/models/`, then regenerate the manifest:

```bash
python3 assets/viewer/build_manifest.py
```

## Files

- `index.html` — WebGL entry (default / courtesy)
- `gpu.html` — WebGPU entry (opt-in / high-performance)
- `viewer-core.js` — shared scene, GLB loading, grid, HUD, toggle, render budget
- `build_manifest.py` / `manifest.json` — the model list the viewer fetches
- `vendor/three/` — vendored three.js (WebGL + WebGPU builds + jsm addons)
- `serve.sh` — local static server helper

Verified headlessly (Chromium + SwiftShader) rendering all 16 models with the
default WebGL courtesy path; the WebGPU opt-in path needs a WebGPU-capable
browser on a machine with a GPU to exercise live.

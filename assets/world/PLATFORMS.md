# Web platform targets: Unity 6 + Python, and Snap AR

Honest status of the two platform directions. Both are **gated on tooling /
credentials that are not present on this build host**, so what's committed is a
working Python core + integration paths, not a pretend "it connects."

## Python (done, verified)

The realistic simulation now lives in Python and drives the live world:
`process_sim.py` is a faithful, numerically-verified port of the Roblox game's
`ProcessEngineering.lua` (Arrhenius, Henry's law, residence-time, pH
precipitation), and `sim_server.py` runs a live leach reactor on it, streamed to
the browser. This is the "learn from molgang-roblox, use Python" piece, and it
is provable here (`python3 assets/world/process_sim.py` self-tests the physics).

## Unity 6 (web build) — user-maintained target

Unity is **not installable/verifiable on this host** (no Unity, no dotnet), so
Unity is not built here. The Unity target is the existing **`molgang-unity`**
repo (`/media/knight2/EDS2/projects/molgang-unity`, with `Assets/` + `Chem.Tests`).

What this world gives the Unity path:
- **Physics parity.** `process_sim.py` is the same chemistry as the Lua module
  and the Unity `Chem.Tests` C#. Port `process_sim.py`'s functions (Arrhenius /
  Henry / residence / precipitation — pure maths, no dependencies) to C# and the
  three runtimes agree. The self-test's asserted values are the C# port's
  fixtures.
- **World data.** `world_gen.py` → `world.json` and the impostor/GLB assets are
  engine-agnostic; a Unity 6 scene can consume the same map + assets and reach
  the same `sim_server.py` `/state` for live agents + the reactor.
- Build for web with Unity 6's WebGL (or WebGPU) target in that repo — a step
  only you can run.

## Snap AR (web) — Camera Kit, token-gated

Snap AR for the web is **Snap's Camera Kit Web SDK** (`@snap/camera-kit`) — NOT
the QuestCameraKit repo on this box (that's Meta Quest passthrough, a different
SDK). Camera Kit needs, from the **Snap Developer Portal** (kit.snapchat.com):

1. an **API token** (staging or production),
2. a **Lens** built in **Lens Studio**, plus its **lens ID** and **lens group ID**.

None of these can be issued or run from this host, so `snap_ar/` is a clearly
labelled **template**, not a live connection. Fill `snap_ar/snap_config.json`
with your token + lens IDs and serve it; it boots Camera Kit against the webcam
and applies your Lens.

How it maps to what's built here:
- The world's **AR overlay** (`world.js`, `?ar=1`) already computes per-object
  labels (identified / diffusion / YOLO / players) and JEPA trajectories. Those
  detections are the natural payload to drive a Snap **Lens** (send them into the
  Lens via Camera Kit's remote API / injected values), so the Lens renders the
  MOLGANG AR HUD over the real camera feed on phones/Spectacles.
- Alternatively, run the three.js world as the Lens background and let Camera Kit
  composite — but the label/prediction logic stays here in JS.

Do not treat `snap_ar/` as working until you've added your Snap credentials.

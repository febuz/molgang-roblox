# MOLGANG · Moleculia (web)

The web continuation of the MOLGANG Roblox teaser: a first-person **Chemical
Engineering Simulator** you walk through in the browser. Moleculia is a floating
archipelago in space with six zones; its core loop is the **Slakkenspoor
factory**, where you process BOF steel slag through the real 12-station line
under real process kinetics, then collect the 118 elements, synthesize
fertilizers from them, and grow crops under Liebig's Law.

Built GPU-thin (49% render budget + instancing + streaming) and Python-heavy
(the world is authored and simulated server-side; the browser is a thin client).
Only the **engine** was reused from the earlier open-world prototype — the
content is rebuilt around the game's actual goals.

## Run it

```bash
# static world (map + streaming renderer) — serve assets/ and open /world/
python3 -m http.server 8082 --directory assets    # http://localhost:8082/world/

# live process sim (the Slakkenspoor reactor + multiplayer presence)
python3 assets/world/sim_server.py                # authority on :8077
```

Controls: **click** to look, **W/A/S/D** move, **Shift** sprint. Buttons: 🌱
Fertilizer Lab (**F**), 🌾 Farm, 🥽 AR (**R** toggles the overlay).
Deep-links: `?cam=overview|factory|biome|pt`, `?world=./world.json` (the legacy
city), `?nointro`. Sandbox: `?collectall`, `?stockfert`, `?farmdemo`, `?lab`,
`?farm`.

## The game, on the web

| System | Where | What you do |
|---|---|---|
| **Operate the plant** | Slakkenspoor zone · control panel | Set feed particle size (crushers), magnetic separation, roasting, then temperature / pressure / pH / flow. Real kinetics (Arrhenius, Henry, residence time, selective precipitation) drive selective **vanadium recovery**; finished batches bank **V₂O₅**. |
| **Collect elements** | Periodic Table Biome | Walk the real periodic table and collect all **118 elements** (each with its real colour + fact). Progress persists (localStorage). |
| **Synthesize fertilizers** | 🌱 Fertilizer Lab | Build the **10 fertilizers** (real NPK + atom recipes) from the elements you've collected. |
| **Farm** | 🌾 Farm | Feed fertilizers to **5 crops**; yield is capped by the scarcest nutrient — **Liebig's Law of the Minimum**. |

## Architecture (engine reused, content rebuilt)

| Layer | File | What it does |
|---|---|---|
| **Map authoring** | `moleculia_gen.py` → `moleculia.json` | Python precomputes Moleculia from the game's data: 6 floating zones, the 12-station Slakkenspoor line (real equipment GLBs), 118 elements (`Data/Elements.lua`), 10 fertilizers + 5 crops (`Modules/FertilizerTrack.lua`). |
| **Renderer** | `world.js` + `index.html` | Thin client: starfield space + floating platforms, streams only nearby GLB models, 49% render-budget loop. Hosts the process control panel, element collection, Fertilizer Lab, and Farm. |
| **Process chemistry** | `process_sim.py` | Faithful port of `Modules/ProcessEngineering.lua`: Arrhenius, Henry, residence-time conversion, Henderson-Hasselbalch precipitation windows. |
| **Live simulation** | `sim_server.py` (:8077) | Python authority owns the reactor the browser operates (`/reactor/set`, `/state`) plus multiplayer presence (`/join`). |
| **World model** | `world_model.py` → `world_model.json` | LeCun **JEPA** predictive model (reusable engine piece; drives the AR trajectory overlay in the legacy city). |
| **P2P asset layer** | `world.js` + optional `ipfs.json` | If present, models load from IPFS (peer-to-peer) with a local fallback. |

The old GTA-style city (`world_gen.py`, `generate_impostors.py`, `fast_gan.py`,
`ar_label.py`) is kept only as a reusable-engine reference, reachable via
`?world=./world.json`.

## Deploy

```bash
bash assets/world/build_deploy.sh          # -> deploy/molgang/ (self-contained, ~22M)
# publish (your SSH):
rsync -az --delete deploy/molgang/  <user>@knitweb.art:/var/www/knitweb.art/molgang/
```

## Validate (no GPU)

```bash
python3 assets/world/moleculia_gen.py      # rebuild the world from the game data
python3 assets/world/world_smoke.py        # integrity check (zones, stations, 118
                                           # elements, 10 fertilizers, 5 crops,
                                           # chemistry optimum, sim reactor)
```

## Honest scope

Verified by headless-browser screenshots: the six labelled zones, the
Slakkenspoor line rendering the real stations, the live reactor + operable
process chain, element collection, Fertilizer Lab, and Liebig farming. Free-roam
movement + pointer-lock look and WebXR/Quest AR need real hardware to feel out.
Not yet on the web: factory building (grid + equipment placement) and the
economy (MolCoins / ANK / MolChain).

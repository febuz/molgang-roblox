# Web ↔ Roblox sync protocol

The web experience (Moleculia) is the **continuation** of the Roblox teaser, so
it must stay in sync with the game's lines — while the web keeps its extra
realism headroom (IBL/bloom/photoscanned props/WebXR, which Roblox can't match).

## Rule 1 — the Roblox Lua modules are the single source of truth

| Game data | Lua source (game/src/…) | Consumed by |
|---|---|---|
| 118 elements (symbol, colour, facts) | `Data/Elements.lua` | `moleculia_gen.py` → `moleculia.json` |
| 10 fertilizers (NPK + atom recipes) | `Modules/FertilizerTrack.lua` | idem |
| 5 crops (ideal NPK, pH, growth days) | `Modules/FertilizerTrack.lua` | idem |
| 34 factory equipment (+ adjacency, floor) | `Modules/FactoryEquipment.lua` | idem |
| 12-station line, particle sizes, roast boost | `Modules/SteelSlag.lua` | gen + `sim_server.py` / `world.js` constants |
| Process kinetics (Arrhenius/Henry/pH) | `Modules/ProcessEngineering.lua` | `process_sim.py` port + JS client reactor |
| V2O5 price (500 MolCoins) | `Modules/ProductMarket.lua` | `sim_server.V2O5_PRICE`, `world.js` |

**Never hand-edit `moleculia.json`** — it is generated. When the Lua changes,
run `python3 assets/world/moleculia_gen.py` and commit the regenerated file.

## Rule 2 — automated drift guards (run before every PR)

```bash
python3 assets/world/moleculia_gen.py --check   # fails if moleculia.json is stale vs the Lua
python3 assets/world/world_smoke.py             # includes Lua-parity asserts:
                                                #  - SteelSlag leachMultipliers == web LEACH_MULT
                                                #  - SteelSlag roasting boostFactor == web ROAST_BOOST
                                                #  - ProductMarket V2O5 basePrice == web V2O5_PRICE
bash assets/world/build_deploy.sh && python3 assets/world/garden_smoke.py
                                                # browser guard (Playwright): the personal garden
                                                # stays the walkable front end for the REAL
                                                # elements -> Fertilizer Lab -> crop economy
                                                # (crops[]/fertInv/fertById) — fails if it ever
                                                # grows a second, invented crop/fertiliser economy
                                                # instead; also guards world grounding (real
                                                # steelworks terrain, never the old space void)
```

All three exit non-zero on drift, so they can gate CI or a pre-commit hook.

## Rule 3 — web keeps its realism surplus

Rendering (HDR pipeline, photoscanned CC0 props, adaptive resolution, WebXR)
and web-only conveniences (client-side reactor for static hosting, ChemSim
console) are **web-side additions** — they must never change the game *data* or
*rules*, only their presentation. New game rules land in the Lua first, then
flow here via Rule 1.

## Rule 4 — PR flow

Web work ships on `web/*` branches with `web(moleculia):` commit prefixes and a
PR against `main`, so Roblox-side agents can review data-contract changes.
Rule-2 guards must pass before merge.

## Synced copy — assets/viscosity/ (web viscosity room)

`assets/viscosity/` is a deploy-ready copy of the viscosity room from the
**molgang-knitweb** repo (`web/viscosity-room.html` → `index.html`, plus
`viscosity-sim.js` and `quest-input.js`; header links rewritten to
`../world/`). The physics authority is the Python module in molgang-web
(`simulation/viscosity_lab/`, 50-check proof suite); the JS port is pinned
to it by `tests/test_viscosity_sim_parity.py` in molgang-knitweb. Update
flow: change molgang-knitweb first, re-copy here, rebuild the bundle with
`build_deploy.sh`. The world links to it via the `interact: "viscosity"`
prop (moleculia_gen.py) handled in world.js.

## Synced copy — assets/steelworks/ (start-environment)

`assets/steelworks/` is a deploy-ready copy of the steelworks start page
from **molgang-knitweb** (`web/steelworks.html` → `index.html`, header
links rewritten to `../world/` & `../viscosity/`, data paths flattened to
`data/`) plus the OSM terrain dataset (`web/steelworks/data`, ODbL,
attribution shown in the UI). The game entry redirect now lands here:
the player starts at their nearest real steel plant. Update flow: change
molgang-knitweb first, re-copy, rebuild with `build_deploy.sh`.

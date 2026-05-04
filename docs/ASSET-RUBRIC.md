# Asset realism rubric — "ships to web"

Every GLB / texture proposed for the canonical store must clear this
rubric before moving from `staging/` to `models/` or `textures/`. The
rubric is mechanical so any agent (or human reviewer) can apply it.

Atlas owns this doc; Mira / Luna / Atlas use it on every batch.

---

## 1. Vertex / triangle budget

| Asset class               | LOD0 (high) | LOD1 (med) | LOD2 (low) | Hard cap |
|---------------------------|-------------|------------|------------|----------|
| Hero character (player)   | ≤ 30 K     | ≤ 12 K    | ≤ 4 K     | 50 K   |
| NPC                       | ≤ 20 K     | ≤ 8 K     | ≤ 2 K     | 30 K   |
| Facility / building       | ≤ 15 K     | ≤ 6 K     | ≤ 2 K     | 25 K   |
| Prop (chair, beaker, sign)| ≤ 5 K      | ≤ 1.5 K   | ≤ 400     | 10 K   |
| Background filler (rock,  | ≤ 1 K      | ≤ 300     | ≤ 100     | 2 K    |
|   foliage card)           |             |            |            |          |
| Molecule (atoms+bonds)    | ≤ 4 K      | ≤ 1 K     | ≤ 300     | 8 K    |

Reject if LOD0 exceeds the hard cap. Procedural pipelines must auto-decimate.

## 2. Texture budget

- **PBR maps required**: albedo + normal + roughness. Metallic/AO/emissive
  optional per material.
- **Resolution defaults**:
  - Hero / NPC face          — 1024² (mobile: 512²)
  - Hero / NPC body          — 2048² (mobile: 1024²)
  - Facility hull / large    — 1024²
  - Prop / molecule / atom   — 512²
  - Background filler        — 256² (often shared atlas)
- **Format**: WebP for color / albedo (smaller than PNG, browser-native).
  PNG fallback when the source is a render. KTX2 once the encode pilot
  (Luna's queued task) confirms a perf win.
- **Mobile variant required** for any model that ships to Z Fold 5 / iPhone 16.

## 3. Format rules

- **Web ship path = GLB.** No exceptions for new assets. FBX stays as
  source / legacy import; `models/` directory is GLB-only.
- **One file per asset.** No nested archives, no multi-mesh GLBs unless
  the meshes share an animation rig.
- **Embedded textures permitted** for ≤ 1 MB GLBs (single-prop). Above
  that, externalize textures to `textures/` so the loader can dedupe.
- **Animations baked in** for character / NPC GLBs. Idle + walk + talk
  states minimum. Action label convention: `idle | walk | run | talk |
  use | <action>`.

## 4. Naming compliance

Filename pattern (enforced by the registry's `categorize()` function):

```
<category>_<subject>_<variant>.<ext>

  ✓  facility_factory_v01.glb
  ✓  character_dr_femke_idle.glb
  ✓  molecule_h2so4_balls.glb
  ✗  Untitled.glb
  ✗  factory_FINAL_FINAL_v3.glb
```

Reject anything not matching `^[a-z0-9_]+\.[a-z0-9]+$`.

## 5. License + attribution

- Asset must be: original work · CC0 · CC-BY (with credit) · or licensed
  under an explicit terms-of-use the user paid for.
- AI-mesh-synthesized assets (Meshy / TripoSR) carry a `license: ai-mesh`
  tag in the registry. Service ToS reviewed before bulk batches.
- Source attribution lives in `assetname.license.txt` next to the file
  when CC-BY or third-party.
- **Reject** anything scraped without provenance — not worth the
  copyright risk at 10K scale.

---

## How to apply

A passing GLB drops into `staging/` first. The reviewer (or a future
auto-checker script) runs through these 5 sections. PASS → move to
`models/` and re-run `build-asset-registry.js`. FAIL → fix or send back.

## Auto-checker (next iteration)

A future Atlas task: `scripts/check-asset.sh <file>` that runs:
1. `gltfpack -f <file>` to read vertex count + texture count + size
2. Compares against the budgets above
3. Validates filename regex
4. Checks for a `<file>.license.txt` sibling

Returns 0 on pass, prints a punch list on fail. Wired into the
registry-build step so failing assets don't auto-promote.

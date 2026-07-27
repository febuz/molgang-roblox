# MOLGANG chem-lab 3D (lab3d)

Interactive three.js lab around the BOF vanadium-recovery process. The
chemistry HUD runs on `chemistry.js`, a JS port of the Godot
`ChemistryEngine` (same balanced redox reactions, NIST formation-energy
thermodynamics, mol/electron bookkeeping, heat-loss calibration).

## Run

Served by the enabled systemd user service `molgang-lab3d.service` at
<http://localhost:8070>. Manual alternative from this directory:

```bash
python3 -m http.server 8070 --bind 127.0.0.1 --directory .
```

Inside the Next.js app the page is reachable as `/lab3d/` (linked from
the Moleculair Lab header).

## Assets (web files + IPFS)

GLB equipment models live in `assets/` and are pinned to IPFS
(`ipfs.json` carries the CID; kubo runs as the `ipfs.service` user
service, gateway `127.0.0.1:8080`). The loader tries the gateway first
and falls back to `./assets/` automatically. After changing assets:

```bash
IPFS_PATH=/media/knight2/EDS2/apps/ipfs/repo \
  /media/knight2/EDS2/apps/ipfs/kubo/ipfs add -r -Q --cid-version 1 assets
# put the printed CID in ipfs.json
```

three.js r170 is vendored under `vendor/three/` (importmap in
`index.html`); no CDN calls anywhere.

### WebGPU contract

The lab requests a real `GPUAdapter`/`GPUDevice` when the browser exposes
WebGPU and reports that capability in the dApp HUD and Pulse events. The
current scene renderer is Three.js WebGL because the vendored post-processing
chain (`EffectComposer` + bloom) is WebGL-based; the HUD deliberately labels
this as `WebGPU device · WebGL scene`. Browsers without an adapter use the
same scene through the explicit WebGL fallback. This keeps the capability
signal honest while preserving the tested P2P, Pulse and chemistry flow.

## Tests

```bash
node chemistry.test.mjs   # 19 parity checks vs the Godot suite, exit-code aware
```

Keep this suite in lockstep with
`molgang-godot/scripts/test_redox_balancer.gd` when either engine
changes — it exists to stop the two ports from drifting apart.

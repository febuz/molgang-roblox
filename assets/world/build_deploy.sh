#!/usr/bin/env bash
# build_deploy.sh — assemble a self-contained deployable bundle of the open
# world, laid out so it serves at https://www.knitweb.art/molgang/.
#
# Produces deploy/molgang/ with the world + only the assets it needs, with the
# relative paths (../models, ../viewer/vendor, ../viewer/manifest.json) intact.
# The actual publish to knitweb.art is a separate, credential-gated step (see
# the printed rsync line) — this script only builds the bundle, which you can
# verify locally first.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"          # repo root
OUT="$ROOT/deploy/molgang"
rm -rf "$OUT"; mkdir -p "$OUT/world" "$OUT/models" "$OUT/viewer/vendor"

# 1. the world (code + generated data + snap template), minus dev-only bits
rsync -a --exclude 'gan_data' --exclude '__pycache__' --exclude '*.pt' \
      "$ROOT/assets/world/" "$OUT/world/"

# 2. only the GLB models the world streams (not the heavy FBX)
cp "$ROOT"/assets/models/*.glb "$OUT/models/" 2>/dev/null || true

# 3. vendored three.js + the manifest the world fetches
cp -r "$ROOT/assets/viewer/vendor/three" "$OUT/viewer/vendor/three"
cp "$ROOT/assets/viewer/manifest.json" "$OUT/viewer/manifest.json"

# 4. viscosity room (synced copy of molgang-knitweb web/viscosity-*, SYNC.md)
cp -r "$ROOT/assets/viscosity" "$OUT/viscosity"

# 4b. quantum computer lab (parallel lane's synced bundle; ship it whenever
# the assets are present so a steelworks deploy never drops their work)
[ -d "$ROOT/assets/quantumlab" ] && cp -r "$ROOT/assets/quantumlab" "$OUT/quantumlab"

# 4c. steelworks start-environment (synced copy of molgang-knitweb
# web/steelworks.html + OSM terrain dataset, see SYNC.md): the game now
# STARTS at the player's nearest real steel plant.
cp -r "$ROOT/assets/steelworks" "$OUT/steelworks"

# 5. entry: knitweb.art/molgang/ -> start at your nearest steel plant
cat > "$OUT/index.html" <<'HTML'
<!doctype html><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=./steelworks/">
<title>MOLGANG</title><a href="./steelworks/">Start: jouw staalfabriek 🏭</a> · <a href="./world/">Moleculia →</a> · <a href="./viscosity/">Viscositeitsruimte 🌀</a> · <a href="./quantumlab/">Kwantumcomputer-lab ⚛️</a>
HTML

BYTES=$(du -sh "$OUT" | cut -f1)
echo "[deploy] built $OUT ($BYTES)"
echo "[deploy] verify locally:  (cd $ROOT/deploy && python3 -m http.server 8095)  then open http://localhost:8095/molgang/"
echo "[deploy] PUBLISH (needs your knitweb.art SSH access — not run here):"
echo "         rsync -az --delete $OUT/  <user>@knitweb.art:/var/www/knitweb.art/molgang/"
echo "[deploy] live sim (optional): run assets/world/sim_server.py on knitweb.art behind a reverse"
echo "         proxy at /sim, and open the world with ?sim=https://www.knitweb.art/sim"

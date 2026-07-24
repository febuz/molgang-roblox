#!/usr/bin/env bash
# Serve the MOLGANG 3D asset viewer locally (browsers block file:// fetch of
# GLB/manifest). Serves the repo's assets/ so the viewer can reach ../models.
# Usage: assets/viewer/serve.sh [port]   then open http://localhost:PORT/viewer/
set -euo pipefail
PORT="${1:-8090}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # -> assets/
cd "$ROOT"
echo "Serving $ROOT at http://localhost:$PORT/viewer/"
exec python3 -m http.server "$PORT" --bind 127.0.0.1

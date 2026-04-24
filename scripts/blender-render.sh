#!/usr/bin/env bash
# blender-render — launch the existing MOLGANG Blender batch with dual-GPU access.
#
# The heavy lifting lives in /home/knight2/molgang-roblox/assets/blender/
# (batch_render_previews.py, generate_mining_models.py, generate_slag_models.py).
# This wrapper just picks the right script, ensures the flatpak sandbox can see
# both 3090s and the assets tree, and logs output to virtualpc/logs.
#
# Usage:
#   blender-render.sh                   # default: render all previews
#   blender-render.sh models            # regenerate mining models
#   blender-render.sh slag              # regenerate slag models
#   blender-render.sh path/to/script.py # run any script inside the assets tree

set -eu

ASSETS_DIR="/home/knight2/molgang-roblox/assets"
SCRIPT_DIR="$ASSETS_DIR/blender"
LOG_DIR="/home/knight2/virtualpc/logs"
mkdir -p "$LOG_DIR"

case "${1:-previews}" in
  previews|preview)  PY="$SCRIPT_DIR/batch_render_previews.py" ;;
  models|mining)     PY="$SCRIPT_DIR/generate_mining_models.py" ;;
  slag)              PY="$SCRIPT_DIR/generate_slag_models.py" ;;
  setup)             PY="$SCRIPT_DIR/setup_gpu_rendering.py" ;;
  *)                 PY="$1" ;;
esac

if [[ ! -f "$PY" ]]; then
  echo "script not found: $PY" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/blender-$(basename "$PY" .py)-$STAMP.log"
echo "▶ running $PY"
echo "  log: $LOG"
echo "  GPUs: 0 and 1 (both 3090s available)"

# Expose both GPUs to Blender. Ollama lives on GPU 1, so under load they compete
# for that card — check `gpu-overview.sh --snapshot` if renders slow down.
exec flatpak run \
  --filesystem=/home/knight2 \
  --env=CUDA_VISIBLE_DEVICES=0,1 \
  org.blender.Blender --background --python "$PY" 2>&1 | tee "$LOG"

#!/usr/bin/env bash
# Force-unload all Ollama models to free VRAM immediately.
# Useful before running Blender renders, fine-tuning jobs, or any other
# GPU workload that needs the full 48GB.

set -eu

BEFORE=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits | paste -sd+ | bc)
echo "VRAM used before: ${BEFORE} MiB"

loaded=$(curl -s http://localhost:11434/api/ps 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(",".join(m["name"] for m in d.get("models",[])))')
if [[ -z "$loaded" ]]; then
  echo "(no models loaded)"
else
  IFS=',' read -ra models <<< "$loaded"
  for m in "${models[@]}"; do
    echo "unloading $m ..."
    curl -s -X POST http://localhost:11434/api/generate \
      -d "{\"model\":\"$m\",\"keep_alive\":0}" > /dev/null
  done
  sleep 2
fi

AFTER=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits | paste -sd+ | bc)
echo "VRAM used after:  ${AFTER} MiB  (freed $((BEFORE-AFTER)) MiB)"

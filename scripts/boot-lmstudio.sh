#!/usr/bin/env bash
# boot-lmstudio.sh — run by the GPU daemon on a down→up transition.
# Best-effort: start LM Studio's server and warm the local models so agents can
# switch back from the no-GPU flux fallback to local GPU inference.
set -u

log() { echo "[boot-lmstudio] $*"; }

# 1) LM Studio server (if the lms CLI is installed).
if command -v lms >/dev/null 2>&1; then
  log "starting LM Studio server (lms server start)"
  lms server start --bind 0.0.0.0 >/dev/null 2>&1 || log "lms server start returned non-zero"
else
  log "lms CLI not found — start LM Studio manually if needed"
fi

# 2) Warm a couple of local Ollama models onto the GPU (GPU 1 per GPU policy).
if command -v ollama >/dev/null 2>&1; then
  export CUDA_VISIBLE_DEVICES="${CUDA_VISIBLE_DEVICES:-1}"
  for m in qwen2.5-coder:32b deepseek-r1:14b; do
    log "warming $m"
    ollama run "$m" "ok" >/dev/null 2>&1 &
  done
fi

log "done"

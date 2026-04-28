#!/usr/bin/env bash
# GPU symbiosis daemon — keep Blender + LM Studio coexisting on the dual 3090.
#
# Every tick we read nvidia-smi for processes claiming GPU memory.
# If Blender is rendering above a threshold (default 2 GB), swap LM Studio
# down to a tiny model so the agents stay reachable without starving the
# render. When Blender exits, restore the preferred larger model.
#
# Logs: /tmp/gpu-symbiosis.log
# Halt:  touch /tmp/gpu-symbiosis-disable
# State: /tmp/gpu-symbiosis-state (records what we swapped, for restore)

set -u

export PATH="$HOME/.lmstudio/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

LOG=/tmp/gpu-symbiosis.log
STATE=/tmp/gpu-symbiosis-state
DISABLE=/tmp/gpu-symbiosis-disable

# Smallest model to keep agents reachable while Blender is busy
TINY_MODEL="${SYMBIOSIS_TINY_MODEL:-microsoft/phi-4}"
# Preferred model to restore once Blender quiets down
PREFERRED_MODEL="${SYMBIOSIS_PREFERRED_MODEL:-microsoft/phi-4}"
# Memory threshold (MiB) above which we consider Blender "rendering"
BLENDER_MEM_THRESHOLD_MB="${SYMBIOSIS_BLENDER_MIB:-2000}"

log() {
  echo "$(date '+%F %T') $*" | tee -a "$LOG"
}

if [ -f "$DISABLE" ]; then
  log "disabled (rm $DISABLE to re-enable)"
  exit 0
fi

# === detect Blender memory usage on either GPU ===
# nvidia-smi pmon -c 1 prints per-process per-GPU stats. We sum any line whose
# command name contains "blender" (case-insensitive).
BLENDER_MEM=0
if command -v nvidia-smi >/dev/null 2>&1; then
  # Use compute-apps query: gives pid, used_memory, process_name per row
  while IFS=, read -r pid used name; do
    # trim whitespace
    name="$(echo "$name" | tr -d ' ')"
    used="$(echo "$used" | tr -d ' MiB')"
    case "$name" in
      *[Bb]lender*|*[Cc]ycles*)
        BLENDER_MEM=$((BLENDER_MEM + ${used:-0}))
      ;;
    esac
  done < <(nvidia-smi --query-compute-apps=pid,used_memory,process_name --format=csv,noheader 2>/dev/null)
fi

log "blender_gpu_mem=${BLENDER_MEM} MiB threshold=${BLENDER_MEM_THRESHOLD_MB} MiB"

# === decide policy ===
PREV_STATE="$(cat "$STATE" 2>/dev/null || echo idle)"

if [ "${BLENDER_MEM}" -ge "${BLENDER_MEM_THRESHOLD_MB}" ]; then
  # Blender is busy — yield to it
  if [ "$PREV_STATE" != "yielded" ]; then
    log "Blender busy (${BLENDER_MEM} MiB) — yielding LM Studio: keep ${TINY_MODEL}, unload heavies"
    # Find any loaded model that isn't TINY_MODEL and unload it
    while IFS= read -r big; do
      [ -z "$big" ] && continue
      [ "$big" = "$TINY_MODEL" ] && continue
      log "  unload $big"
      lms unload "$big" >> "$LOG" 2>&1 || true
    done < <(lms ps 2>/dev/null | tail -n +2 | awk '$1!="" && $1!~/^\-+$/ {print $1}' | grep -vi "^IDENTIFIER$")
    # Make sure the tiny model is loaded so agents don't go silent
    if ! lms ps 2>/dev/null | grep -q "${TINY_MODEL}"; then
      log "  load fallback ${TINY_MODEL}"
      lms load "${TINY_MODEL}" --ttl 3600 >> "$LOG" 2>&1 || true
    fi
    echo "yielded:${PREV_STATE}" > "$STATE"
  fi
else
  # Blender quiet — restore if we previously yielded
  if [ "$PREV_STATE" = "yielded" ] || [[ "$PREV_STATE" = yielded:* ]]; then
    log "Blender idle — restoring preferred model ${PREFERRED_MODEL}"
    if ! lms ps 2>/dev/null | grep -q "${PREFERRED_MODEL}"; then
      lms load "${PREFERRED_MODEL}" --ttl 3600 >> "$LOG" 2>&1 || true
    fi
    echo "idle" > "$STATE"
  elif [ "$PREV_STATE" != "idle" ]; then
    echo "idle" > "$STATE"
  fi
fi

if [ "${1:-}" = "--daemon" ]; then
  log "daemon mode — sleeping 30s loop"
  while [ ! -f "$DISABLE" ]; do
    sleep 30
    bash "$0"
  done
fi

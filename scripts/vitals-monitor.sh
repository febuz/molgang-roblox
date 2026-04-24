#!/usr/bin/env bash
# System vitals sampler.
#
# Produces two outputs:
#   logs/vitals.jsonl       — append-only time series (one JSON line per sample)
#   logs/gpu-overview.json  — latest snapshot (overwritten each tick)
#
# Per sample we capture:
#   - Host: load, CPU%, memory, disk (root + EDS2)
#   - GPUs: util, mem_used, mem_total, temp, power (per card)
#   - GPU compute processes: pid, gpu_index, name, memory, mapped agent
#   - Service liveness: virtualpc (3100), ollama (11434)
#
# Agent mapping lets you see "who's holding VRAM right now." Extend the
# classify() function when you add more workloads.
#
# Usage: vitals-monitor.sh [interval_seconds]   (default 30)
#        vitals-monitor.sh --once               (one sample, then exit)

set -u

INTERVAL="${1:-30}"
LOG_DIR="/home/knight2/virtualpc/logs"
JSONL="$LOG_DIR/vitals.jsonl"
SNAP="$LOG_DIR/gpu-overview.json"
mkdir -p "$LOG_DIR"

# Map a process cmdline pattern to a human-readable agent name.
classify() {
  local cmd="$1"
  case "$cmd" in
    *"ollama serve"*|*"ollama-serve"*|*"/ollama-install/bin/ollama"*) echo "ollama-server" ;;
    *"ollama runner"*|*"runner "*) echo "ollama-runner" ;;  # per-model child
    *"node dist/index.js"*)                                  echo "virtualpc" ;;
    *"obs --multi"*|*"obs-browser-page"*)                    echo "OBS" ;;
    *"type=gpu-process"*|*"chromium"*|*"chrome"*)            echo "chromium" ;;
    *"Xorg"*)                                                echo "xorg" ;;
    *"gnome-shell"*)                                         echo "gnome-shell" ;;
    *"blender"*)                                             echo "blender" ;;
    *"claude"*)                                              echo "claude-code" ;;
    *"python"*)                                              echo "python" ;;
    *)                                                       echo "other" ;;
  esac
}

# Resolve PID → full cmdline (null-safe)
pid_cmd() {
  local pid="$1"
  [[ -r "/proc/$pid/cmdline" ]] || { echo ""; return; }
  tr '\0' ' ' < "/proc/$pid/cmdline" | sed 's/ $//'
}

sample() {
  local ts load1 load5 load15 mem_total mem_used mem_avail cpu_pct
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  read -r load1 load5 load15 _ < /proc/loadavg
  read -r _ mem_total mem_used _ _ _ mem_avail < <(free -m | awk 'NR==2')

  local root_used root_free eds2_used eds2_free
  read -r root_used root_free < <(df -BG / | awk 'NR==2 {gsub("%","",$5); gsub("G","",$4); print $5, $4}')
  read -r eds2_used eds2_free < <(df -BG /media/knight2/EDS2 2>/dev/null | awk 'NR==2 {gsub("%","",$5); gsub("G","",$4); print $5, $4}')
  eds2_used="${eds2_used:-0}"
  eds2_free="${eds2_free:-0}"

  cpu_pct=$(top -bn1 | awk '/Cpu\(s\)/ {print 100 - $8; exit}')

  # Per-GPU summary
  local gpus
  gpus=$(nvidia-smi --query-gpu=index,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw \
                    --format=csv,noheader,nounits 2>/dev/null \
         | awk -F', *' 'BEGIN{printf "["} {if(NR>1)printf ","; printf "{\"i\":%d,\"util\":%d,\"mem_used\":%d,\"mem_total\":%d,\"temp\":%d,\"power\":%.1f}",$1,$2,$3,$4,$5,$6} END{printf "]"}')
  gpus="${gpus:-[]}"

  # Per-process GPU attribution. Python handles the JSON escaping — bash
  # string mangling breaks on cmdlines with nested quotes (LM Studio's
  # `node -e '...require("...");...'` is a notorious offender).
  local procs_json
  procs_json=$(python3 <<'PY'
import json, os, re, subprocess
r = subprocess.run(["nvidia-smi", "pmon", "-c", "1", "-s", "m"],
                   capture_output=True, text=True)
rows = []
for line in r.stdout.splitlines():
    if not line or line.startswith("#"):
        continue
    parts = line.split()
    if len(parts) < 4 or not parts[1].isdigit():
        continue
    gpu, pid, _proc_type, mem = parts[0], int(parts[1]), parts[2], parts[3]
    try:
        with open(f"/proc/{pid}/cmdline", "rb") as f:
            cmd = f.read().replace(b"\x00", b" ").decode("utf-8", "replace").strip()
    except FileNotFoundError:
        cmd = ""
    name = re.sub(r".*/", "", cmd.split()[0] if cmd else "")
    # Agent classifier mirrors the bash classify() function.
    lc = cmd.lower()
    if "ollama serve" in cmd or "/ollama-install/bin/ollama" in cmd:
        agent = "ollama-server"
    elif "ollama runner" in cmd or "ollama runner" in lc:
        agent = "ollama-runner"
    elif "node dist/index.js" in cmd:
        agent = "virtualpc"
    elif "lmstudio" in cmd or "llmworker" in cmd or "llmster" in cmd:
        agent = "lm-studio"
    elif "obs --multi" in cmd or "obs-browser-page" in cmd:
        agent = "OBS"
    elif "type=gpu-process" in cmd or "chromium" in cmd or "chrome" in cmd:
        agent = "chromium"
    elif "Xorg" in cmd:
        agent = "xorg"
    elif "gnome-shell" in cmd:
        agent = "gnome-shell"
    elif "blender" in cmd:
        agent = "blender"
    elif "claude" in cmd:
        agent = "claude-code"
    elif "python" in cmd:
        agent = "python"
    else:
        agent = "other"
    rows.append({
        "pid": pid, "gpu": int(gpu), "mem_mb": int(mem) if mem != "-" else 0,
        "name": name, "agent": agent, "cmd": cmd[:160],
    })
print(json.dumps(rows))
PY
)
  [[ -z "$procs_json" ]] && procs_json="[]"

  # Ollama loaded-models summary (which model lives in VRAM right now)
  local ollama_ps
  ollama_ps=$(curl -s --max-time 1 http://localhost:11434/api/ps 2>/dev/null)
  [[ -z "$ollama_ps" ]] && ollama_ps='{"models":[]}'

  # Service liveness
  local vpc_up=0 ollama_up=0
  ss -tln 2>/dev/null | grep -q ':3100 '  && vpc_up=1
  ss -tln 2>/dev/null | grep -q ':11434 ' && ollama_up=1

  # Assemble sample line
  local line
  line=$(printf '{"ts":"%s","load":{"1":%s,"5":%s,"15":%s},"cpu_pct":%.1f,"mem_mb":{"total":%s,"used":%s,"avail":%s},"disk":{"root_used_pct":%s,"root_free_gb":%s,"eds2_used_pct":%s,"eds2_free_gb":%s},"gpus":%s,"gpu_procs":%s,"ollama":%s,"services":{"virtualpc_3100":%d,"ollama_11434":%d}}' \
    "$ts" "$load1" "$load5" "$load15" "${cpu_pct:-0}" "$mem_total" "$mem_used" "$mem_avail" \
    "$root_used" "$root_free" "$eds2_used" "$eds2_free" "$gpus" "$procs_json" "$ollama_ps" "$vpc_up" "$ollama_up")

  echo "$line" >> "$JSONL"
  echo "$line" > "$SNAP.tmp" && mv "$SNAP.tmp" "$SNAP"
}

if [[ "${1:-}" == "--once" ]]; then
  sample
  exit 0
fi

echo "vitals-monitor: interval=${INTERVAL}s jsonl=$JSONL snap=$SNAP"
while true; do
  sample
  sleep "$INTERVAL"
done

#!/usr/bin/env bash
# gpu-overview — live GPU snapshot + time-windowed stats from vitals.jsonl.
#
# Usage:
#   gpu-overview.sh                # full report
#   gpu-overview.sh --snapshot     # just the latest snapshot
#   gpu-overview.sh --history 1h   # only the rolling window stats
#   gpu-overview.sh --json         # machine-readable
#
# Time windows: 1m, 5m, 15m, 1h, 24h, all.

set -eu

LOG_DIR="/home/knight2/virtualpc/logs"
JSONL="$LOG_DIR/vitals.jsonl"
SNAP="$LOG_DIR/gpu-overview.json"

mode="${1:-full}"

exec python3 - "$mode" "$SNAP" "$JSONL" <<'PY'
import json, sys, os, time
from datetime import datetime, timezone, timedelta
from collections import defaultdict

mode, snap_path, jsonl_path = sys.argv[1], sys.argv[2], sys.argv[3]
now = datetime.now(timezone.utc)

def parse_ts(ts):
    # "2026-04-24T02:23:43Z"
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))

def load_snap():
    if not os.path.exists(snap_path):
        return None
    with open(snap_path) as f:
        return json.load(f)

def iter_recent(window):
    """Yield samples newer than (now - window seconds). Reads file backward for speed."""
    if not os.path.exists(jsonl_path):
        return
    cutoff = now - timedelta(seconds=window) if window else None
    # For simplicity just read the whole file (vitals ticks at 30s, so 1 day ≈ 2880 lines).
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                s = json.loads(line)
            except json.JSONDecodeError:
                continue
            if cutoff and parse_ts(s["ts"]) < cutoff:
                continue
            yield s

WINDOWS = [
    ("1m",   60),
    ("5m",   300),
    ("15m",  900),
    ("1h",   3600),
    ("24h",  86400),
    ("all",  None),
]

def p(pct, vals):
    if not vals: return 0
    vs = sorted(vals)
    k = int(round((pct/100) * (len(vs)-1)))
    return vs[k]

def fmt_pct(x): return f"{x:5.1f}%"
def fmt_mb(x):  return f"{x:>6}MiB"

def print_snapshot(d):
    if not d:
        print("(no snapshot yet — run `bash scripts/vitals-monitor.sh --once` first)")
        return
    print(f"┌── SNAPSHOT @ {d['ts']} " + "─"*40)
    cpu = d.get('cpu_pct', 0)
    mem = d['mem_mb']
    disk = d['disk']
    load = d['load']
    print(f"│ host    load {load['1']}/{load['5']}/{load['15']}  cpu {cpu}%  mem {mem['used']}/{mem['total']}MiB avail {mem['avail']}MiB")
    print(f"│ disk    root {disk['root_used_pct']}% ({disk['root_free_gb']}GB free)   eds2 {disk['eds2_used_pct']}% ({disk['eds2_free_gb']}GB free)")
    print(f"│ svcs    virtualpc(3100)={'UP' if d['services']['virtualpc_3100'] else 'DOWN'}   ollama(11434)={'UP' if d['services']['ollama_11434'] else 'DOWN'}")
    print(f"│")
    print(f"│ GPUs")
    total_used = total_cap = 0
    for g in d['gpus']:
        pct_mem = 100*g['mem_used']/max(g['mem_total'],1)
        bar = '█' * int(pct_mem/5) + '·'*(20 - int(pct_mem/5))
        print(f"│   GPU{g['i']}  util {g['util']:>3}%  mem [{bar}] {g['mem_used']:>6}/{g['mem_total']}MiB ({pct_mem:.0f}%)  {g['temp']}°C  {g['power']}W")
        total_used += g['mem_used']; total_cap += g['mem_total']
    print(f"│         combined VRAM {total_used}/{total_cap}MiB ({100*total_used/max(total_cap,1):.0f}%)")
    print(f"│")
    print(f"│ GPU processes (which agent holds the cards)")
    # group by agent
    agg = defaultdict(lambda: {'mem':0,'gpus':set(),'pids':set(),'cmd':''})
    for p_ in d.get('gpu_procs',[]):
        a = agg[p_['agent']]
        a['mem'] += p_['mem_mb']
        a['gpus'].add(p_['gpu'])
        a['pids'].add(p_['pid'])
        if not a['cmd']: a['cmd'] = p_['cmd'][:80]
    if not agg:
        print(f"│   (no compute processes — GPUs idle)")
    else:
        # sort by memory descending
        for agent, a in sorted(agg.items(), key=lambda kv: -kv[1]['mem']):
            gpus = ','.join(str(g) for g in sorted(a['gpus']))
            pids = ','.join(str(p) for p in sorted(a['pids']))
            print(f"│   {agent:<16} mem {a['mem']:>6}MiB  gpu[{gpus}]  pids[{pids}]")
    # Ollama loaded models
    om = d.get('ollama', {}).get('models', [])
    if om:
        print(f"│")
        print(f"│ Ollama loaded models")
        for m in om:
            vram = m.get('size_vram',0)/(1024**3)
            ctx = m.get('context_length','?')
            exp = m.get('expires_at','?')[:19]
            print(f"│   {m['name']:<30} vram {vram:>5.1f}GiB  ctx {ctx}  keepalive→{exp}")
    print("└" + "─"*60)

def print_history():
    # For each window, compute per-GPU util stats + VRAM stats + agent-seconds
    print()
    print("┌── TIME-WINDOWED STATS " + "─"*40)
    print(f"│ {'window':<5} {'n':>4}  {'gpu0 util avg/p95/max':<24} {'gpu1 util avg/p95/max':<24} {'combined VRAM avg/max (MiB)'}")
    for name, secs in WINDOWS:
        samples = list(iter_recent(secs))
        n = len(samples)
        if n == 0:
            print(f"│ {name:<5} {0:>4}  (no samples)")
            continue
        util0 = [s['gpus'][0]['util'] for s in samples if len(s.get('gpus',[]))>0]
        util1 = [s['gpus'][1]['util'] for s in samples if len(s.get('gpus',[]))>1]
        vram  = [sum(g['mem_used'] for g in s.get('gpus',[])) for s in samples]
        def stat(xs): return f"{sum(xs)/len(xs):>5.1f}/{p(95,xs):>3}/{max(xs):>3}" if xs else "  - /  - /  -"
        print(f"│ {name:<5} {n:>4}  {stat(util0):<24} {stat(util1):<24} {sum(vram)/len(vram):>6.0f} / {max(vram):>6}")
    # Agent-time: how many sampling ticks each agent held VRAM, summed MiB·ticks
    print("│")
    print("│ Agent VRAM-time by window (MiB·ticks):")
    for name, secs in WINDOWS:
        samples = list(iter_recent(secs))
        if not samples: continue
        agent_mem = defaultdict(int)
        for s in samples:
            for p_ in s.get('gpu_procs', []):
                agent_mem[p_['agent']] += p_['mem_mb']
        top = sorted(agent_mem.items(), key=lambda kv: -kv[1])[:5]
        row = "  ".join(f"{a}={m}" for a,m in top) if top else "(none)"
        print(f"│   {name:<5} {row}")
    print("└" + "─"*60)

snap = load_snap()
if mode in ("full", "--full"):
    print_snapshot(snap)
    print_history()
elif mode in ("--snapshot", "snapshot"):
    print_snapshot(snap)
elif mode in ("--history", "history"):
    print_history()
elif mode in ("--json", "json"):
    out = {"snapshot": snap, "windows": {}}
    for name, secs in WINDOWS:
        samples = list(iter_recent(secs))
        if not samples:
            out["windows"][name] = {"n": 0}
            continue
        util0 = [s['gpus'][0]['util'] for s in samples if len(s.get('gpus',[]))>0]
        util1 = [s['gpus'][1]['util'] for s in samples if len(s.get('gpus',[]))>1]
        vram  = [sum(g['mem_used'] for g in s.get('gpus',[])) for s in samples]
        agent_mem = defaultdict(int)
        for s in samples:
            for p_ in s.get('gpu_procs', []):
                agent_mem[p_['agent']] += p_['mem_mb']
        out["windows"][name] = {
            "n": len(samples),
            "gpu0_util": {"avg": sum(util0)/len(util0) if util0 else 0,
                           "p95": p(95,util0), "max": max(util0) if util0 else 0},
            "gpu1_util": {"avg": sum(util1)/len(util1) if util1 else 0,
                           "p95": p(95,util1), "max": max(util1) if util1 else 0},
            "vram_mib":  {"avg": sum(vram)/len(vram) if vram else 0,
                           "max": max(vram) if vram else 0},
            "agent_mib_ticks": dict(sorted(agent_mem.items(), key=lambda kv: -kv[1])),
        }
    print(json.dumps(out, indent=2, default=str))
else:
    print(f"unknown mode: {mode}")
    sys.exit(2)
PY

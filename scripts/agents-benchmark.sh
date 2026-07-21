#!/usr/bin/env bash
# agents-benchmark.sh — fire one short prompt at every agent in the roster
# and print a tok/s table. Useful for catching constraint regressions
# (model unloaded, OOM fallback, CLI auth lapse) before they show up
# in real workflows.
#
# Usage:
#   ./scripts/agents-benchmark.sh                # full roster
#   ./scripts/agents-benchmark.sh Kai Mira Atlas # subset
#   AGENTS_URL=http://other:3100 ./scripts/agents-benchmark.sh
set -eu

URL="${AGENTS_URL:-http://localhost:3100}"
if [[ $# -gt 0 ]]; then
  AGENTS_JSON=$(printf '"%s",' "$@" | sed 's/,$//')
  BODY="{\"agents\":[${AGENTS_JSON}],\"max_tokens\":80}"
else
  BODY='{"max_tokens":80}'
fi

echo "▶ benchmarking via ${URL}/api/agents/benchmark (sequential to avoid GPU contention)"
RESP=$(curl -fsS -X POST "${URL}/api/agents/benchmark" -H 'Content-Type: application/json' -d "${BODY}")
TOTAL=$(echo "$RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["totalMs"])')

echo
echo "┌──────────────────┬──────────────────────┬──────────┬──────────┬──────────┬──────────┐"
echo "│ Agent            │ Model served         │  tok/s   │ prompt t │ output t │ latency  │"
echo "├──────────────────┼──────────────────────┼──────────┼──────────┼──────────┼──────────┤"
echo "$RESP" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for r in d.get("results", []):
    if r.get("ok"):
        print("│ {:<16} │ {:<20} │ {:>7.1f}  │ {:>8}  │ {:>8}  │ {:>6} ms │".format(
            r["agent"], r.get("model",""), r.get("tokensPerSec",0),
            r.get("promptTokens",0), r.get("completionTokens",0), r.get("latencyMs",0)))
    else:
        print("│ {:<16} │ {:<20} │     —    │     —    │     —    │     — ms │  {}".format(
            r["agent"], "(failed)", r.get("reason","")[:60]))
'
echo "└──────────────────┴──────────────────────┴──────────┴──────────┴──────────┴──────────┘"
echo
echo "  total wall time: ${TOTAL} ms"
echo "  next: open /agents.html — every card now shows tokens/sec from this run"

#!/usr/bin/env bash
# ollama-bench — compare Ollama models on the same prompt.
#
# Usage:
#   ollama-bench.sh                                   # default prompt, all locally-pulled models
#   ollama-bench.sh "your prompt here"                # custom prompt, all models
#   ollama-bench.sh "prompt" qwen2.5-coder:14b,...    # specific models

set -eu

PROMPT="${1:-Write a Python function that returns the nth Fibonacci number using memoisation. Include a one-line docstring.}"
MODELS_ARG="${2:-}"

if [[ -z "$MODELS_ARG" ]]; then
  MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c 'import sys,json; [print(m["name"]) for m in json.load(sys.stdin).get("models",[])]')
else
  MODELS=$(echo "$MODELS_ARG" | tr ',' '\n')
fi

printf "%-30s %10s %12s %10s %8s\n" "model" "prompt_t" "gen_t" "t/s" "ms"
printf "%s\n" "------------------------------ ---------- ------------ ---------- --------"

for MODEL in $MODELS; do
  RESPONSE=$(curl -s --max-time 300 -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'model':'$MODEL','prompt':'''$PROMPT''','stream':False,'options':{'num_predict':160}}))")")
  python3 - "$MODEL" <<PY
import json, sys
d = json.loads("""$RESPONSE""" if False else r'''$RESPONSE''')
m = "$MODEL"
p = d.get("prompt_eval_count", 0)
g = d.get("eval_count", 0)
dur = d.get("eval_duration", 1) / 1e9
ms = d.get("total_duration", 0) / 1e6
tps = g / dur if dur else 0
print(f"{m:<30} {p:>10} {g:>12} {tps:>10.1f} {int(ms):>8}")
PY
done

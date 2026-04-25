#!/usr/bin/env bash
# Read VirtualPC's stored provider credentials and emit `export FOO=...` lines
# for the env vars LiteLLM expects. Source this before bringing the LiteLLM
# proxy up so cloud routes have keys available.
#
# Usage:
#   eval "$(bash scripts/export-credentials-env.sh)"
#   docker compose -f deploy/docker-compose.litellm.yml up -d

set -euo pipefail

CRED="${VIRTUALPC_CREDENTIALS_FILE:-/media/knight2/EDS2/virtualpc-state/credentials.json}"

if [ ! -f "$CRED" ]; then
  echo "# no credentials file at $CRED" >&2
  exit 0
fi

# Map provider id -> canonical env var name (matches src/credentials.ts)
jq -r '
  .providers[] |
  select(.api_key != null and .api_key != "") |
  (
    if .provider == "anthropic"  then "ANTHROPIC_API_KEY"
    elif .provider == "openai"   then "OPENAI_API_KEY"
    elif .provider == "grok"     then "XAI_API_KEY"
    elif .provider == "deepseek" then "DEEPSEEK_API_KEY"
    elif .provider == "kimi"     then "MOONSHOT_API_KEY"
    elif .provider == "perplexity" then "PPLX_API_KEY"
    elif .provider == "mistral"  then "MISTRAL_API_KEY"
    elif .provider == "google"   then "GOOGLE_API_KEY"
    else (.provider | ascii_upcase + "_API_KEY")
    end
  ) as $var |
  "export " + $var + "=\"" + .api_key + "\""
' "$CRED"

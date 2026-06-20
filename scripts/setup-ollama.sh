#!/usr/bin/env bash
# One-shot setup for VirtualPC on a machine that uses Ollama as its local LLM backend.
#
# This script:
#   1. Checks / installs Ollama
#   2. Pulls the default Ollama models referenced in deploy/litellm-config.yaml
#   3. Starts Ollama
#   4. Runs the standard VirtualPC install.sh
#   5. Starts the VirtualPC + LiteLLM + auto-update services
#
# Usage:
#   ./scripts/setup-ollama.sh
#
# Requirements: git, node 18+, npm, docker. Run from the repo root.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing required tool: $1"; exit 1; }; }
need git
need node
need npm
need docker

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "node $NODE_MAJOR detected; need >= 18"
  exit 1
fi

OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"

install_ollama() {
  if command -v ollama >/dev/null 2>&1; then
    echo "==> Ollama already installed: $(ollama --version 2>/dev/null || true)"
    return 0
  fi

  echo "==> Installing Ollama..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew >/dev/null 2>&1; then
      brew install ollama
    else
      echo "    Please install Ollama manually from https://ollama.com/download"
      exit 1
    fi
  else
    curl -fsSL https://ollama.com/install.sh | sh
  fi
}

wait_for_ollama() {
  echo "==> Waiting for Ollama at $OLLAMA_HOST..."
  for i in {1..30}; do
    if curl -fsS "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
      echo "    Ollama is up"
      return 0
    fi
    sleep 1
  done
  echo "    Ollama did not become ready in time."
  exit 1
}

start_ollama() {
  if curl -fsS "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
    echo "==> Ollama is already running"
    return 0
  fi

  echo "==> Starting Ollama..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a Ollama || true
  else
    nohup ollama serve >/tmp/ollama.log 2>&1 &
  fi
  wait_for_ollama
}

pull_models() {
  echo "==> Pulling default Ollama models..."
  # These match the model_name entries in deploy/litellm-config.yaml under the Ollama block.
  # On low-RAM machines the user can comment out the larger ones.
  local models=(
    "hermes3:8b"
    "hermes3:3b"
    "deepseek-r1:14b"
    "qwen2.5-coder:14b"
    "nomic-embed-text"
  )
  for m in "${models[@]}"; do
    echo "    pulling $m..."
    ollama pull "$m" || echo "    warning: failed to pull $m (may be too large for this machine)"
  done
}

configure_env() {
  if [ ! -f .env ]; then
    echo "==> Creating .env from .env.example"
    cp .env.example .env
  fi

  # Ensure LITELLM_URL points at the local LiteLLM proxy.
  if grep -q '^LITELLM_URL=' .env; then
    sed -i.bak 's|^LITELLM_URL=.*|LITELLM_URL=http://127.0.0.1:4000|' .env && rm -f .env.bak
  else
    echo 'LITELLM_URL=http://127.0.0.1:4000' >> .env
  fi
}

main() {
  echo "==> VirtualPC Ollama setup"
  echo "    repo: $REPO_DIR"
  echo "    host: $OLLAMA_HOST"

  install_ollama
  start_ollama
  pull_models

  echo "==> Running standard VirtualPC install..."
  ./scripts/install.sh

  configure_env

  echo "==> Starting VirtualPC services..."
  systemctl --user start virtualpc-litellm.service || true
  systemctl --user start virtualpc.service || true
  systemctl --user start virtualpc-auto-update.timer || true

  echo
  echo "==> Done. Verify with:"
  echo "    curl http://localhost:3100/api/health"
  echo "    curl http://localhost:4000/health/liveliness"
  echo "    curl http://localhost:11434/api/tags   # Ollama models"
  echo
  echo "    Dashboard: http://localhost:3100/dashboard.html"
  echo "    Landing:   public/index.html"
}

main "$@"

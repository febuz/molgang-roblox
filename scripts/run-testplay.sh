#!/usr/bin/env bash
# Run the Playwright testplay campaign and publish results for the dashboard.
# Alexander owns this script's tech-stack choices; Zip owns the scenarios.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="$REPO_ROOT/tests/testplay/results"

cd "$REPO_ROOT"
mkdir -p "$RESULTS_DIR"

# Is Playwright installed?
if ! node -e "require('@playwright/test')" 2>/dev/null; then
  echo "⚠ Playwright not installed. Writing placeholder result and bailing."
  cat > "$RESULTS_DIR/latest.json" <<'JSON'
{
  "_placeholder": true,
  "reason": "Playwright not installed. Run: npm install -D @playwright/test && npx playwright install chromium",
  "config": {},
  "stats": { "startTime": null, "duration": 0, "expected": 0, "unexpected": 0, "skipped": 0, "flaky": 0 },
  "suites": []
}
JSON
  exit 0
fi

# Is the server reachable?
BASE_URL="${TESTPLAY_BASE_URL:-http://localhost:3100}"
if ! curl -fsS -o /dev/null -m 3 "$BASE_URL/api/health"; then
  echo "⚠ Server at $BASE_URL unreachable. Start with: node dist/index.js"
  cat > "$RESULTS_DIR/latest.json" <<JSON
{
  "_placeholder": true,
  "reason": "Server unreachable at $BASE_URL",
  "stats": { "startTime": "$(date -u +%FT%TZ)", "duration": 0 }
}
JSON
  exit 1
fi

export TESTPLAY_BASE_URL="$BASE_URL"
npx playwright test -c tests/testplay/playwright.config.ts "$@"
STATUS=$?

echo "Results written to $RESULTS_DIR/latest.json"
exit $STATUS

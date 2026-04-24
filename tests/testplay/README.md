# VirtualPC Testplay

Automated testplay scenarios that drive the MOLGANG web game with real mouse/keyboard actions via Playwright (browser) and, later, pyautogui (native).

**Owner:** Alexander (technical arbiter) signs off on the testplay tech stack; Zip implements scenarios.

## Quickstart

```bash
# One-time install
cd /home/knight2/virtualpc
npm install -D @playwright/test
npx playwright install chromium

# Make sure the VirtualPC server is running (localhost:3100)
node dist/index.js &

# Run the campaign
npx playwright test -c tests/testplay/playwright.config.ts
```

Results land in `tests/testplay/results/latest.json` and are read by `/api/testplay/latest` so they show up on the dashboard.

## Scenarios

| File | Covers |
|---|---|
| `atom-lab.spec.ts` | Hub loads, atom collection advances HUD, Synthesis Lab recipes render |

More scenarios (Fertilizer Factory, Market, Minigames) land as the testplay framework fills in.

## Design notes

- Human-like pacing (`humanClick`): mouse move in steps, 80-180ms between actions.
- Canvas-based games need coordinate-grid clicks (atoms move; assert by HUD delta not by locator).
- Retries = 1 to tolerate transient animation timing issues.
- Screenshots + traces kept on failure for Alexander's triage.

## Load-test adapter (planned)

The same scenarios will drive the load-test farm with thousands of concurrent headless clients. Keep scenarios parameterized and side-effect-clean.

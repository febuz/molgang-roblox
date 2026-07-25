#!/bin/bash
# MOLGANG — Launch Roblox Studio with the latest build
#
# Usage: ./launch_studio.sh
#
# 1. Builds the .rbxl from Rojo
# 2. Copies to Wine Documents folder
# 3. Starts Rojo serve (live sync)
# 4. Launches Studio via Vinegar
# 5. Prints instructions for opening the file

ROJO="${ROJO:-/home/knight2/.local/bin/rojo}"
PROJECT="/home/knight2/molgang-roblox/game"
OUTPUT="/home/knight2/molgang-roblox/MOLGANG_OTAP_Test.rbxl"
WINE_DOCS="/home/knight2/.var/app/org.vinegarhq.Vinegar/data/vinegar/prefixes/studio/drive_c/users/knight2/Documents"
WINE_PLACE="Z:/home/knight2/Documents/MOLGANG_OTAP_Test.rbxl"
PARENT_SESSION_GUID=$(cat /proc/sys/kernel/random/uuid)
KEEP_STUDIO=0

echo "=== MOLGANG Studio Launcher ==="
echo ""

# Avoid multiple Wine/Studio trees. A stale Studio instance can keep the
# WebView2/Toolbox process alive and make the next Vinegar window appear hung.
echo "[0/4] Closing stale Vinegar/Studio session..."
# A hung Wine child must never prevent the build phase from running.
timeout 8 flatpak kill org.vinegarhq.Vinegar >/dev/null 2>&1 || true
sleep 2

# Step 1: Build
echo "[1/4] Building .rbxl..."
if ! command -v "$ROJO" >/dev/null 2>&1; then
  echo "Rojo not found at $ROJO" >&2
  exit 127
fi
"$ROJO" build "$PROJECT" -o "$OUTPUT"
SCRIPTS=$(find "$PROJECT/src" -name "*.lua" | wc -l)
LOC=$(find "$PROJECT/src" -name "*.lua" -exec cat {} + | wc -l)
echo "      Built: $OUTPUT ($(du -h "$OUTPUT" | cut -f1), $SCRIPTS scripts, $LOC LOC)"

# Step 2: Copy to Wine
echo "[2/4] Copying to Wine Documents..."
mkdir -p "$WINE_DOCS"
cp "$OUTPUT" "$WINE_DOCS/"
echo "      Copied to: $WINE_DOCS/MOLGANG_OTAP_Test.rbxl"

# Step 3: Start Rojo serve
echo "[3/4] Starting Rojo serve (live sync)..."
# A timed-out launcher can leave the project-specific Rojo child alive. Clean
# only that exact project server so port 34872 cannot produce a false-positive
# "live sync" status on the next launch.
while read -r stale_pid; do
  [ -z "$stale_pid" ] && continue
  kill "$stale_pid" 2>/dev/null || true
done < <(pgrep -f "[r]ojo serve $PROJECT" || true)
sleep 1
"$ROJO" serve "$PROJECT" &
ROJO_PID=$!
cleanup() {
  if [ "${KEEP_STUDIO:-0}" -ne 1 ] && [ -n "${STUDIO_PID:-}" ]; then
    kill "$STUDIO_PID" 2>/dev/null || true
  fi
  if [ -n "${ROJO_PID:-}" ]; then
    kill "$ROJO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'cleanup; exit 143' INT TERM
sleep 2
if ! curl -fsS http://127.0.0.1:34872/ >/dev/null 2>&1; then
  echo "      WARNING: Rojo did not bind localhost:34872"
  exit 1
fi
echo "      Rojo serve running on localhost:34872 (PID: $ROJO_PID)"

# Step 4: Launch Studio
echo "[4/4] Launching Roblox Studio via Vinegar..."
# Let Vinegar select the active graphics device. Forcing a host Vulkan ICD
# made Studio choose an incompatible D3D11 path and exit before opening the
# local place on some OTAP hosts.
# Explicit EditFile intent is required by current Studio builds. Passing only
# the Linux path starts the shell/start page with Studio Launch Intent=None;
# the Wine Documents path plus EditFile opens the place data model directly.
flatpak run org.vinegarhq.Vinegar \
  -task EditFile \
  -localPlaceFile "$WINE_PLACE" \
  -userid 9400855976 \
  -parentPid "$$" \
  -parentSessionGuid "$PARENT_SESSION_GUID" \
  -baseUrl https://www.roblox.com \
  -channel zbuck2release-730-control &
STUDIO_PID=$!
echo "      Studio launching (PID: $STUDIO_PID)"

# Vinegar can return successfully while Wine's Studio process exits during
# graphics/WebView startup. Do not call that a healthy playtest launch.
STUDIO_DETECTED=0
for _ in $(seq 1 20); do
  # Vinegar and wineserver can remain alive after Studio itself has crashed.
  # Only the actual Studio executable proves that a window/playtest can work.
  if ps -eo pid=,args= | awk '$2 ~ /RobloxStudioBeta[.]exe/ { found = 1 } END { exit(found ? 0 : 1) }'; then
    STUDIO_DETECTED=1
  else
    # Do not turn a short-lived process into a false-positive launch.
    STUDIO_DETECTED=0
  fi
  sleep 1
done
if [ "$STUDIO_DETECTED" -eq 1 ]; then
  echo "      Studio process detected; F5 playtest is available"
else
  echo "      WARNING: Studio process was not detected after 20s"
  echo "      Check Vinegar logs for Wine/D3D/WebView startup failures"
  exit 1
fi

# A Wine Studio process can exist while the start page is still hung. Require
# the local-place state machine to report a successful open before claiming
# that OTAP is ready; this prevents a false-positive "READY" on Vinegar 0.731.
PLACE_READY=0
for _ in $(seq 1 20); do
  LATEST_STUDIO_LOG=$(ls -1t /home/knight2/.var/app/org.vinegarhq.Vinegar/data/vinegar/appdata/Roblox/logs/*Studio*_last.log 2>/dev/null | head -1)
  if [ -n "$LATEST_STUDIO_LOG" ] && rg -q "State: OpenPlaceSuccess|OpenPlaceSuccess" "$LATEST_STUDIO_LOG"; then
    PLACE_READY=1
    break
  fi
  sleep 1
done
if [ "$PLACE_READY" -ne 1 ]; then
  echo "      WARNING: Studio did not report OpenPlaceSuccess for $WINE_PLACE"
  LATEST_VINEGAR_LOG=$(ls -1t /home/knight2/.var/app/org.vinegarhq.Vinegar/cache/vinegar/logs/*.log 2>/dev/null | head -1)
  if { [ -n "$LATEST_STUDIO_LOG" ] && rg -q "ROBLOSECURITY cookie not found|UserIdAndCookieMismatch|Invalid CookieManager" "$LATEST_STUDIO_LOG"; } \
    || { [ -n "$LATEST_VINEGAR_LOG" ] && rg -q "ROBLOSECURITY cookie not found|UserIdAndCookieMismatch|Invalid CookieManager" "$LATEST_VINEGAR_LOG"; }; then
    KEEP_STUDIO=1
    echo "      Studio authentication is unavailable; sign in to Roblox Studio/Vinegar and retry"
    echo "      Browser flow: open Vinegar Settings → Log in via browser → Continue → Open Vinegar"
    echo "      If WebView is blank, disable Web Pages in Vinegar Settings and use browser login"
    echo "      CLI settings: flatpak run org.vinegarhq.Vinegar manage"
    echo "      Studio is being left open so the browser-login flow can complete"
    echo "      This launcher remains attached until Studio is closed"
    wait "$STUDIO_PID" 2>/dev/null || true
  else
    echo "      The process is alive, but the place is not loaded; inspect the latest Studio log"
  fi
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  MOLGANG STUDIO READY"
echo "═══════════════════════════════════════════════"
echo ""
echo "  In Roblox Studio:"
echo "  1. File → Open from File"
echo "  2. Navigate to: Documents"
echo "  3. Open: MOLGANG_OTAP_Test.rbxl"
echo "  4. Press F5 to playtest"
echo "  5. AutoTestRunner prints results to Output"
echo ""
echo "  Rojo live sync: localhost:34872"
echo "  (Install Rojo plugin in Studio → Plugins → Manage)"
echo ""
echo "  Press Ctrl+C to stop all processes"
echo "═══════════════════════════════════════════════"

# Wait for user to stop
wait $STUDIO_PID

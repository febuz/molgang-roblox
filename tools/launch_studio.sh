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

echo "=== MOLGANG Studio Launcher ==="
echo ""

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
"$ROJO" serve "$PROJECT" &
ROJO_PID=$!
sleep 2
echo "      Rojo serve running on localhost:34872 (PID: $ROJO_PID)"

# Step 4: Launch Studio
echo "[4/4] Launching Roblox Studio via Vinegar..."
flatpak run org.vinegarhq.Vinegar "$OUTPUT" &
STUDIO_PID=$!
echo "      Studio launching (PID: $STUDIO_PID)"

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
kill $ROJO_PID 2>/dev/null

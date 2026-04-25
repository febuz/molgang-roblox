#!/bin/bash
# MOLGANG — Screenshot Monitor for Game Testing
# Captures Studio screenshots at intervals for visual QA
#
# Usage: ./screenshot_monitor.sh [interval_seconds] [output_dir]
# Default: 30 second intervals, saves to docs/screenshots/

INTERVAL=${1:-30}
OUTPUT_DIR=${2:-"/home/knight2/molgang-roblox/docs/screenshots"}
mkdir -p "$OUTPUT_DIR"

echo "=== MOLGANG Screenshot Monitor ==="
echo "Interval: ${INTERVAL}s"
echo "Output:   $OUTPUT_DIR"
echo "Press Ctrl+C to stop"
echo ""

COUNT=0
while true; do
    COUNT=$((COUNT + 1))
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    FILENAME="${OUTPUT_DIR}/molgang_${TIMESTAMP}_${COUNT}.png"

    # Focus Roblox Studio window
    WID=$(xdotool search --name "Roblox Studio" 2>/dev/null | head -1)
    if [ -n "$WID" ]; then
        xdotool windowactivate "$WID" 2>/dev/null
        sleep 0.5

        # Capture just the Studio window (not full screen)
        import -window "$WID" "$FILENAME" 2>/dev/null || scrot -u "$FILENAME" 2>/dev/null || scrot "$FILENAME" 2>/dev/null

        SIZE=$(du -h "$FILENAME" 2>/dev/null | cut -f1)
        echo "[$(date +%H:%M:%S)] Screenshot #$COUNT saved: $FILENAME ($SIZE)"
    else
        echo "[$(date +%H:%M:%S)] Roblox Studio not found — skipping"
    fi

    sleep "$INTERVAL"
done

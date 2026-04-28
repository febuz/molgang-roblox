#!/usr/bin/env bash
# Install the GPU symbiosis daemon as a user systemd service + timer.
# Pairs with the lmstudio-watchdog.timer: watchdog keeps LM Studio alive,
# symbiosis adapts its loaded model size based on whether Blender is rendering.
#
# Usage:    bash scripts/install-gpu-symbiosis.sh
# Uninstall: systemctl --user disable --now gpu-symbiosis.{service,timer}
# Pause:     touch /tmp/gpu-symbiosis-disable

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/gpu-symbiosis.service" <<EOF
[Unit]
Description=VirtualPC GPU symbiosis (Blender ↔ LM Studio coexistence)
After=graphical-session.target

[Service]
Type=oneshot
Environment="HOME=$HOME"
Environment="PATH=$HOME/.lmstudio/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=$REPO_ROOT/scripts/gpu-symbiosis.sh
Nice=10
EOF

cat > "$UNIT_DIR/gpu-symbiosis.timer" <<EOF
[Unit]
Description=Run VirtualPC GPU symbiosis check every 30s
Requires=gpu-symbiosis.service

[Timer]
OnBootSec=45s
OnUnitActiveSec=30s
AccuracySec=5s
Persistent=true

[Install]
WantedBy=timers.target
EOF

chmod +x "$REPO_ROOT/scripts/gpu-symbiosis.sh"
systemctl --user daemon-reload
systemctl --user enable --now gpu-symbiosis.timer

echo ""
echo "✓ Installed gpu-symbiosis.service + .timer in $UNIT_DIR"
echo ""
systemctl --user status gpu-symbiosis.timer --no-pager 2>&1 | head -10
echo ""
echo "Symbiosis runs every 30s. Logs: /tmp/gpu-symbiosis.log"
echo "Pause:   touch /tmp/gpu-symbiosis-disable"
echo "Resume:  rm /tmp/gpu-symbiosis-disable"

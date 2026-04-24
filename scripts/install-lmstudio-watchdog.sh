#!/usr/bin/env bash
# Install the LM Studio watchdog as a user systemd service + timer.
# Keeps the local inference backend available for VirtualPC agents across reboots.
#
# Usage:  bash scripts/install-lmstudio-watchdog.sh
# Uninstall: systemctl --user disable --now lmstudio-watchdog.{service,timer}

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/lmstudio-watchdog.service" <<EOF
[Unit]
Description=VirtualPC LM Studio watchdog (keeps local inference alive)
After=graphical-session.target

[Service]
Type=oneshot
Environment="HOME=$HOME"
Environment="PATH=$HOME/.lmstudio/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=$REPO_ROOT/scripts/lmstudio-watchdog.sh
Nice=5
EOF

cat > "$UNIT_DIR/lmstudio-watchdog.timer" <<EOF
[Unit]
Description=Run VirtualPC LM Studio watchdog every minute
Requires=lmstudio-watchdog.service

[Timer]
OnBootSec=30s
OnUnitActiveSec=60s
AccuracySec=5s
Persistent=true

[Install]
WantedBy=timers.target
EOF

chmod +x "$REPO_ROOT/scripts/lmstudio-watchdog.sh"
systemctl --user daemon-reload
systemctl --user enable --now lmstudio-watchdog.timer

echo ""
echo "✓ Installed lmstudio-watchdog.service + .timer in $UNIT_DIR"
echo ""
systemctl --user status lmstudio-watchdog.timer --no-pager | head -10
echo ""
echo "Watchdog now runs every 60s. Logs: /tmp/lmstudio-watchdog.log"
echo "Manual trigger: systemctl --user start lmstudio-watchdog.service"

#!/bin/bash
# MOLGANG — Install GPU Work Scheduler as systemd service
# Runs continuously, processing render/conversion jobs on 2x RTX 3090
#
# Usage: bash assets/pipeline/install_scheduler.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="molgang-gpu-scheduler"
VENV="$SCRIPT_DIR/../pipeline_env"
SCHEDULER="$SCRIPT_DIR/gpu_scheduler.py"

echo "=== MOLGANG GPU Scheduler Installation ==="
echo "Script: $SCHEDULER"
echo "Venv: $VENV"

# Create systemd user service
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/$SERVICE_NAME.service << EOF
[Unit]
Description=MOLGANG GPU Work Scheduler (2x RTX 3090)
After=network.target

[Service]
Type=simple
ExecStart=$VENV/bin/python3 $SCHEDULER --daemon
WorkingDirectory=$SCRIPT_DIR
Restart=always
RestartSec=10
Environment=CUDA_VISIBLE_DEVICES=0,1

# Logging
StandardOutput=append:$SCRIPT_DIR/scheduler_stdout.log
StandardError=append:$SCRIPT_DIR/scheduler_stderr.log

[Install]
WantedBy=default.target
EOF

# Enable and start
systemctl --user daemon-reload
systemctl --user enable $SERVICE_NAME
systemctl --user start $SERVICE_NAME

echo ""
echo "=== Scheduler installed ==="
echo "Status: systemctl --user status $SERVICE_NAME"
echo "Logs:   journalctl --user -u $SERVICE_NAME -f"
echo "Stop:   systemctl --user stop $SERVICE_NAME"
echo ""
echo "Add jobs:"
echo "  python3 $SCHEDULER --add-render /path/to/scene.blend"
echo "  python3 $SCHEDULER --add-convert /path/to/model.obj"
echo "  python3 $SCHEDULER --status"
echo ""

# Also add a cron job to restart if crashed (belt + suspenders)
(crontab -l 2>/dev/null; echo "*/5 * * * * systemctl --user is-active $SERVICE_NAME || systemctl --user start $SERVICE_NAME") | sort -u | crontab -

echo "Cron watchdog installed (checks every 5 minutes)"
echo "=== Done ==="

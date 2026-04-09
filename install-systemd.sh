#!/bin/bash

# ============================================================
# Install VirtualPC as systemd service for automatic startup
# ============================================================

echo "📦 Installing VirtualPC systemd service..."

# Copy service file to systemd directory
sudo cp /home/knight2/virtualpc/virtualpc.service /etc/systemd/system/virtualpc.service

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start at boot
sudo systemctl enable virtualpc.service

# Start the service
sudo systemctl start virtualpc.service

echo ""
echo "✅ VirtualPC installed as systemd service"
echo ""
echo "Available commands:"
echo "  Start:    sudo systemctl start virtualpc"
echo "  Stop:     sudo systemctl stop virtualpc"
echo "  Status:   sudo systemctl status virtualpc"
echo "  Logs:     sudo journalctl -u virtualpc -f"
echo "  Disable:  sudo systemctl disable virtualpc"
echo ""
echo "Service will now start automatically at system startup."

#!/usr/bin/env bash
# Install user-mode systemd units for ollama + virtualpc.
# Survives a single user session by default; sudo loginctl enable-linger
# is needed for survival across logouts.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.config/systemd/user"
mkdir -p "$DEST"
cp "$HERE/ollama.service" "$HERE/virtualpc.service" "$DEST/"
systemctl --user daemon-reload
systemctl --user enable --now ollama.service virtualpc.service
echo "✓ services installed and started:"
systemctl --user --no-pager is-active ollama.service virtualpc.service
echo
echo "To survive logout/reboot: sudo loginctl enable-linger $USER"

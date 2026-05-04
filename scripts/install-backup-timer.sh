#!/usr/bin/env bash
# install-backup-timer.sh — install the weekly EDS2 asset backup as a
# user-level systemd timer.
#
# Idempotent: safe to re-run; will overwrite existing units.
#
# Usage:
#   ./scripts/install-backup-timer.sh                # install + enable
#   ./scripts/install-backup-timer.sh --uninstall    # disable + remove
#   ./scripts/install-backup-timer.sh --status       # show timer status
set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
SRC_DIR="$REPO_DIR/deploy/systemd"
SERVICE="molgang-backup.service"
TIMER="molgang-backup.timer"

cmd="${1:-install}"

case "$cmd" in
  --uninstall|uninstall)
    echo "▶ disabling + removing $TIMER + $SERVICE"
    systemctl --user disable --now "$TIMER" 2>/dev/null || true
    rm -f "$UNIT_DIR/$TIMER" "$UNIT_DIR/$SERVICE"
    systemctl --user daemon-reload
    echo "✓ uninstalled"
    ;;
  --status|status)
    systemctl --user list-timers --all "$TIMER" 2>/dev/null || true
    echo ""
    systemctl --user status "$TIMER" --no-pager 2>/dev/null || true
    ;;
  install|--install|"")
    mkdir -p "$UNIT_DIR"
    cp "$SRC_DIR/$SERVICE" "$UNIT_DIR/$SERVICE"
    cp "$SRC_DIR/$TIMER" "$UNIT_DIR/$TIMER"
    systemctl --user daemon-reload
    systemctl --user enable --now "$TIMER"
    echo "✓ installed $TIMER (Sun 02:30 local, persistent)"
    echo ""
    systemctl --user list-timers "$TIMER" --no-pager
    echo ""
    echo "Next steps:"
    echo "  • Set BACKUP_TARGET to an off-host path for real safety."
    echo "    Edit ~/.config/systemd/user/molgang-backup.env and add:"
    echo "      BACKUP_TARGET=user@host:/path/to/backup"
    echo "    Then uncomment the EnvironmentFile line in $UNIT_DIR/$SERVICE."
    echo "  • Test the script manually first: $REPO_DIR/scripts/backup-eds2-assets.sh --dry-run"
    ;;
  *)
    echo "usage: $0 [install|--uninstall|--status]" >&2
    exit 2
    ;;
esac

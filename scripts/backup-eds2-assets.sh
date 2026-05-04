#!/usr/bin/env bash
# backup-eds2-assets.sh — rsync the EDS2 canonical asset store to a backup target.
#
# Today there is no backup of /media/knight2/EDS2/molgang-assets. At the
# 10K-asset target that's potentially weeks of irreplaceable creative work.
# This is the minimum-viable insurance.
#
# Defaults:
#   BACKUP_TARGET — /media/knight2/EDS2/backups/molgang-assets (same disk, NOT off-site)
#                   Override with a USB drive path or remote rsync target for real safety.
#   ROTATE_DAYS=14 — number of dated snapshots to keep
#
# Usage:
#   ./scripts/backup-eds2-assets.sh                 # ad-hoc run
#   ./scripts/backup-eds2-assets.sh --dry-run       # preview
#   BACKUP_TARGET=user@host:/path ./scripts/backup-eds2-assets.sh   # off-host
#
# Wire as a weekly systemd timer (Kai's queued task) once the target is
# decided. For now the script is callable from cron / manually.
set -eu

SOURCE="${EDS2_ASSETS:-/media/knight2/EDS2/molgang-assets}"
TARGET="${BACKUP_TARGET:-/media/knight2/EDS2/backups/molgang-assets}"
ROTATE_DAYS="${ROTATE_DAYS:-14}"
STAMP=$(date +%Y%m%d-%H%M)
DRY="${1:-}"
[[ "$DRY" == "--dry-run" ]] && DRY_FLAG="--dry-run" || DRY_FLAG=""

if [[ ! -d "$SOURCE" ]]; then
  echo "error: source $SOURCE not found" >&2; exit 1
fi

# Local target gets the dated-snapshot pattern (rsync --link-dest creates
# hardlinked dedupe). Remote rsync targets get the same data without the
# hardlink trick (target host doesn't support it cross-FS).
echo "▶ backup $SOURCE → $TARGET (snapshot $STAMP)"
SOURCE_BYTES=$(du -sb "$SOURCE" 2>/dev/null | awk '{print $1}')
SOURCE_HUMAN=$(numfmt --to=iec-i --suffix=B "$SOURCE_BYTES" 2>/dev/null || echo "$SOURCE_BYTES bytes")
echo "  source size: $SOURCE_HUMAN"

if [[ "$TARGET" == *":"* ]]; then
  # Remote rsync target — straightforward
  rsync -a --partial --info=stats2 $DRY_FLAG \
    "$SOURCE/" "$TARGET/$STAMP/"
else
  mkdir -p "$TARGET"
  LATEST="$TARGET/latest"
  SNAP="$TARGET/$STAMP"
  if [[ -d "$LATEST" ]]; then
    rsync -a --partial --info=stats2 --link-dest="$LATEST" $DRY_FLAG \
      "$SOURCE/" "$SNAP/"
  else
    rsync -a --partial --info=stats2 $DRY_FLAG \
      "$SOURCE/" "$SNAP/"
  fi
  if [[ -z "$DRY_FLAG" ]]; then
    rm -f "$LATEST"
    ln -s "$SNAP" "$LATEST"
  fi

  # Rotate older snapshots
  echo "▶ rotating snapshots older than $ROTATE_DAYS days"
  find "$TARGET" -maxdepth 1 -mindepth 1 -type d -name "20??????-????" \
       -mtime "+$ROTATE_DAYS" $DRY_FLAG -exec rm -rf {} + 2>/dev/null || true
fi

echo "✓ backup complete (snapshot: $STAMP)"
echo "  next: schedule weekly via systemd timer or cron"
echo "  recommended: also set BACKUP_TARGET to an OFF-HOST path so a single-disk failure doesn't lose everything"

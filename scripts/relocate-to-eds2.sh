#!/usr/bin/env bash
# relocate-to-eds2 — move a directory to EDS2 and symlink it back in place.
# Used to keep the root disk (/dev/sda2, 116GB) below pressure by offloading
# regeneratable caches and large app data to EDS2 (/dev/nvme0n1p2, 1.1TB).
#
# Usage:
#   relocate-to-eds2.sh <path> [dest_root]
#
# Safe for: cache directories, app data for processes that aren't running.
# Skip:     active node_modules of running services, snap-confined app data
#           (snap sandbox can't follow symlinks outside the home interface).

set -eu

SRC="${1:?usage: relocate-to-eds2.sh <path> [dest_root]}"
DEST_ROOT="${2:-/media/knight2/EDS2/home-data}"

if [[ ! -e "$SRC" ]]; then
  echo "error: $SRC does not exist" >&2
  exit 1
fi
if [[ -L "$SRC" ]]; then
  echo "info: $SRC is already a symlink → $(readlink "$SRC")"
  exit 0
fi

NAME="$(basename "$SRC")"
PARENT_TOKEN="$(basename "$(dirname "$SRC")")"
DEST="${DEST_ROOT}/${PARENT_TOKEN}--${NAME}"
SIZE="$(du -hs "$SRC" | cut -f1)"

mkdir -p "$DEST_ROOT"
if [[ -e "$DEST" ]]; then
  echo "error: $DEST already exists — refusing to overwrite" >&2
  exit 1
fi

echo "moving $SRC ($SIZE) → $DEST"
mv "$SRC" "$DEST"
ln -s "$DEST" "$SRC"
echo "done. verify: ls -la $SRC"

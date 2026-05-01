#!/usr/bin/env bash
# disk-pressure — current root vs EDS2 capacity + top relocation candidates.
#
# Lists the largest dirs under /home/knight2 that aren't already symlinked
# elsewhere, so you can see what's worth relocating next via:
#
#   scripts/relocate-to-eds2.sh <path>
#
# Skips currently in-use service state dirs (virtualpc/node_modules,
# claude/, paperclip/) by default — pass --include-active to override.

set -eu

INCLUDE_ACTIVE=0
[[ "${1:-}" == "--include-active" ]] && INCLUDE_ACTIVE=1

echo "═════════════════════════════════════════════════════════════"
echo "  disk pressure"
echo "═════════════════════════════════════════════════════════════"
df -h / /media/knight2/EDS2 2>/dev/null | grep -v tmpfs

echo
echo "─── Already on EDS2 ───────────────────────────────────────"
for root in home-cache home-data dev-tools applications/obs-studio/recordings ollama-models ollama-install; do
  full="/media/knight2/EDS2/$root"
  [[ -d "$full" ]] || continue
  printf "  %-46s %s\n" "$root" "$(du -hs "$full" 2>/dev/null | cut -f1)"
done

echo
echo "─── Top relocation candidates under /home/knight2 ─────────"
echo "    (size · path · status)"
{
  # Direct children of $HOME
  for d in /home/knight2/.[a-zA-Z]* /home/knight2/[a-zA-Z]*; do
    [[ -d "$d" ]] || continue
    [[ -L "$d" ]] && continue  # already relocated
    echo "$d"
  done
  # Children inside .cache and .local/share that aren't symlinks
  for parent in /home/knight2/.cache /home/knight2/.local/share /home/knight2/.local/lib; do
    [[ -d "$parent" ]] || continue
    for d in "$parent"/*; do
      [[ -d "$d" ]] || continue
      [[ -L "$d" ]] && continue
      echo "$d"
    done
  done
} | while read -r d; do
  bytes=$(du -bs --exclude='node_modules' "$d" 2>/dev/null | cut -f1)
  [[ -z "$bytes" || "$bytes" -lt 52428800 ]] && continue  # skip <50MB
  hsize=$(du -hs "$d" 2>/dev/null | cut -f1)
  status=""
  case "$d" in
    */virtualpc/node_modules|*/custom-paperclip/node_modules|*/.claude|*/.paperclip|*/virtualpc|*/custom-paperclip)
      status="ACTIVE — skip" ;;
    */snap|*/snap/*)
      status="snap-confined — edit app config instead" ;;
    */agents|*/agents)
      status="git repo — move with care" ;;
  esac
  if [[ "$INCLUDE_ACTIVE" -eq 0 && "$status" == "ACTIVE — skip" ]]; then continue; fi
  printf "  %8s  %-60s %s\n" "$hsize" "$d" "$status"
done | sort -rh | head -15

echo
echo "─── How to relocate ───────────────────────────────────────"
echo "  scripts/relocate-to-eds2.sh <path>       # mv + symlink"
echo "  scripts/gpu-clean.sh                     # free Ollama VRAM"
echo "  curl -X POST localhost:3100/api/gpu/clean  # via API"

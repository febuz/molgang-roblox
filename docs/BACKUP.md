# EDS2 asset backup

The canonical asset store at `/media/knight2/EDS2/molgang-assets/` is the
single source of truth for every GLB / texture / audio / animation that
ships into the Roblox game and the web port. At the 10 K-asset target
that's potentially weeks of irreplaceable creative work. This doc
explains how that data is protected.

## What we have today

| Layer                | Status   | Where |
|----------------------|----------|-------|
| Backup script        | shipped  | `scripts/backup-eds2-assets.sh` |
| Weekly systemd timer | shipped  | `deploy/systemd/molgang-backup.{timer,service}` |
| Off-host target      | **not configured** — relies on user setting `BACKUP_TARGET` |

The backup script:
- rsync's the source tree with `--link-dest` so each weekly snapshot
  shares unchanged bytes with the previous (hardlink dedupe — typically
  a 100× space saving for asset stores that grow incrementally).
- Maintains a `latest/` symlink pointing at the most recent snapshot.
- Rotates snapshots older than `ROTATE_DAYS` (default 14).
- Supports remote rsync targets via `BACKUP_TARGET=user@host:/path` —
  in that case the hardlink trick is dropped (target FS may not support
  it cross-host) but the rest works.

## Install the timer

```bash
cd ~/virtualpc
./scripts/install-backup-timer.sh
```

That installs `molgang-backup.service` + `molgang-backup.timer` into
`~/.config/systemd/user/` and enables the timer. Default schedule:
**Sunday 02:30 local, with `Persistent=true`** so a missed run (machine
off / asleep) catches up on next boot.

Verify:

```bash
./scripts/install-backup-timer.sh --status
# or
systemctl --user list-timers molgang-backup.timer
```

Uninstall:

```bash
./scripts/install-backup-timer.sh --uninstall
```

## Configure an off-host target — strongly recommended

The default backup target is on the same EDS2 disk as the source. That
protects against accidental deletion / `rm -rf` mistakes but **does not**
survive a disk failure. Set an off-host target by creating
`~/.config/systemd/user/molgang-backup.env`:

```
# rsync over SSH to a NAS / second machine / cloud-mounted FS
BACKUP_TARGET=knight2@nas.local:/srv/backups/molgang-assets

# or a separate local mount
# BACKUP_TARGET=/mnt/backup-drive/molgang-assets
```

Then uncomment the `EnvironmentFile=` line in
`~/.config/systemd/user/molgang-backup.service`:

```ini
EnvironmentFile=-%h/.config/systemd/user/molgang-backup.env
```

Reload + restart the timer:

```bash
systemctl --user daemon-reload
systemctl --user restart molgang-backup.timer
```

## Test before relying on it

```bash
# Dry run — no writes:
./scripts/backup-eds2-assets.sh --dry-run

# Real run, manual:
systemctl --user start molgang-backup.service
journalctl --user -u molgang-backup.service -e
```

The journal output reports source size + the snapshot folder name, so
you can confirm data actually moved.

## Restore

A snapshot is a plain rsync tree — no proprietary format. To restore:

```bash
# pick a snapshot
ls -lt /media/knight2/EDS2/backups/molgang-assets/ | head

# rsync back (dry run first, always)
rsync -av --dry-run \
  /media/knight2/EDS2/backups/molgang-assets/<TIMESTAMP>/ \
  /media/knight2/EDS2/molgang-assets/
```

For an off-host restore, swap the source path with the `BACKUP_TARGET`
URL.

## What's not covered (yet)

- **Off-site backup**: an off-host target on the local network is one
  hop better than same-disk; off-site (S3 / Backblaze / B2) is two hops
  better. Not yet wired.
- **Asset-registry consistency check**: nothing today verifies that
  `shared/asset-registry.json` matches the backed-up tree's manifest.
  A future `scripts/verify-backup.sh` would diff the two.
- **Encrypted backups**: rsync is plaintext over SSH. Fine for trusted
  networks; for a public S3 bucket use `restic` or `borg` instead.

#!/usr/bin/env bash
# Backups for ADSIGN Skill Academy.
#   backup.sh db     -> compressed PostgreSQL dump (daily)
#   backup.sh files  -> uploaded files: assignments, materials, profile photos (weekly)
# Keeps 30 days locally in $BACKUP_DIR and copies each backup off the server with rclone when
# BACKUP_REMOTE is set (e.g. "b2:adsign-backups", configured once with `rclone config`).
set -euo pipefail

MODE="${1:-db}"
APP_DIR="${APP_DIR:-/srv/adsign}"
[ -f "$APP_DIR/.env" ] && set -a && . "$APP_DIR/.env" && set +a
BACKUP_DIR="${BACKUP_DIR:-/var/backups/adsign}"
KEEP_DAYS="${KEEP_DAYS:-30}"
UPLOAD_DIR="${UPLOAD_DIR:-$APP_DIR/uploads}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/files"

case "$MODE" in
  db)
    : "${DATABASE_URL:?DATABASE_URL is not set}"
    OUT="$BACKUP_DIR/db/adsign-db-$STAMP.dump"
    # Custom format: compressed, and restorable table by table
    pg_dump --format=custom --no-owner --no-privileges --dbname="${DATABASE_URL%%\?*}" --file="$OUT.partial"
    mv "$OUT.partial" "$OUT"
    pg_restore --list "$OUT" > /dev/null   # fails loudly if the dump is unreadable
    ;;
  files)
    OUT="$BACKUP_DIR/files/adsign-uploads-$STAMP.tar.gz"
    if [ -d "$UPLOAD_DIR" ]; then tar -czf "$OUT" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"; else tar -czf "$OUT" --files-from /dev/null; fi
    ;;
  *)
    echo "usage: backup.sh db|files" >&2
    exit 2
    ;;
esac

sha256sum "$OUT" > "$OUT.sha256"
echo "$(date -u +%FT%TZ) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy "$OUT" "$BACKUP_REMOTE/$MODE/" && rclone copy "$OUT.sha256" "$BACKUP_REMOTE/$MODE/"
  rclone delete --min-age "${KEEP_DAYS}d" "$BACKUP_REMOTE/$MODE/" || true
  echo "$(date -u +%FT%TZ) copied off-server to $BACKUP_REMOTE/$MODE/"
else
  echo "WARNING: BACKUP_REMOTE is not set; the backup exists only on this server" >&2
fi

find "$BACKUP_DIR/$MODE" -type f -mtime +"$KEEP_DAYS" -delete

#!/usr/bin/env bash
# Restores ADSIGN Skill Academy from a backup.
#   restore.sh db <dump-file|latest> [target-database-url]
#   restore.sh files <tar.gz|latest>
# Without a target URL the live database (DATABASE_URL) is replaced, after confirmation.
set -euo pipefail

MODE="${1:?usage: restore.sh db|files <file|latest> [target-url]}"
FILE="${2:?usage: restore.sh db|files <file|latest> [target-url]}"
APP_DIR="${APP_DIR:-/srv/adsign}"
[ -f "$APP_DIR/.env" ] && set -a && . "$APP_DIR/.env" && set +a
BACKUP_DIR="${BACKUP_DIR:-/var/backups/adsign}"

if [ "$FILE" = latest ]; then
  FILE="$(ls -1t "$BACKUP_DIR/$MODE"/*.{dump,tar.gz} 2>/dev/null | head -1 || true)"
  [ -n "$FILE" ] || { echo "No local $MODE backups in $BACKUP_DIR/$MODE (download one with rclone first)" >&2; exit 1; }
fi
[ -f "$FILE.sha256" ] && sha256sum --check --status "$FILE.sha256" && echo "Checksum ok: $FILE"

case "$MODE" in
  db)
    TARGET="${3:-${DATABASE_URL%%\?*}}"
    if [ -z "${3:-}" ] && [ "${FORCE:-}" != "1" ]; then
      read -r -p "This REPLACES the live database with $FILE. Type RESTORE to continue: " ok
      [ "$ok" = RESTORE ] || { echo "Cancelled"; exit 1; }
    fi
    pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$TARGET" "$FILE"
    echo "Database restored from $FILE"
    ;;
  files)
    UPLOAD_DIR="${UPLOAD_DIR:-$APP_DIR/uploads}"
    tar -xzf "$FILE" -C "$(dirname "$UPLOAD_DIR")"
    echo "Uploaded files restored to $UPLOAD_DIR"
    ;;
esac

#!/usr/bin/env bash
# Proves the latest database backup can be restored: loads it into a throw-away database,
# checks the key tables have rows, then drops it. Run monthly (cron) and before go-live.
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/adsign}"
[ -f "$APP_DIR/.env" ] && set -a && . "$APP_DIR/.env" && set +a
BACKUP_DIR="${BACKUP_DIR:-/var/backups/adsign}"
: "${DATABASE_URL:?DATABASE_URL is not set}"

LATEST="$(ls -1t "$BACKUP_DIR"/db/*.dump | head -1)"
BASE="${DATABASE_URL%%\?*}"
SERVER="${BASE%/*}"
TEST_DB="adsign_restore_test_$(date +%s)"

psql "$SERVER/postgres" -qc "CREATE DATABASE $TEST_DB;"
trap 'psql "$SERVER/postgres" -qc "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE);"' EXIT

START=$(date +%s)
pg_restore --no-owner --no-privileges --dbname="$SERVER/$TEST_DB" "$LATEST"
SECS=$(( $(date +%s) - START ))

for table in User Course Enrollment Payment Invoice; do
  n=$(psql "$SERVER/$TEST_DB" -tAc "SELECT count(*) FROM \"$table\";")
  echo "  $table: $n rows"
  [ "$table" = User ] && [ "$n" -eq 0 ] && { echo "RESTORE TEST FAILED: no users in $LATEST" >&2; exit 1; }
done
echo "$(date -u +%FT%TZ) restore test ok: $LATEST restored in ${SECS}s"

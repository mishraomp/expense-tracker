#!/usr/bin/env bash
set -euo pipefail

# Environment variables expected:
# POSTGRES_HOST (default: postgres)
# POSTGRES_PORT (default: 5432)
# POSTGRES_USER
# PGPASSWORD (for authentication)
# BACKUP_DIR (default: /backup)
# RCLONE_CONFIG, RCLONE_REMOTE, RCLONE_BACKUP_FOLDER, BACKUP_RETENTION_DAYS (for Google Drive sync + rotation)

POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
BACKUP_DIR=${BACKUP_DIR:-/backup}
DATE=$(date +%F)

usage() {
  echo "Postgres backup/restore utility (whole-cluster: expense_tracker + keycloak + metabase)"
  echo "Usage (backup):   docker compose run --rm pg-backup /scripts/backup.sh"
  echo "Usage (restore):  docker compose run --rm pg-backup /scripts/backup.sh --restore --date=YYYY-MM-DD --yes"
  echo "  Restore pulls the backup from Google Drive automatically if it isn't present locally."
  exit 1
}

# Parse args
RESTORE_MODE=false
RESTORE_DATE=""
CONFIRM=false
for arg in "$@"; do
  case $arg in
    --restore) RESTORE_MODE=true ;;
    --date=*) RESTORE_DATE="${arg#*=}" ;;
    --yes) CONFIRM=true ;;
    --help|-h) usage ;;
  esac
done

mkdir -p "$BACKUP_DIR"

if [ "$RESTORE_MODE" = true ]; then
  if [ -z "$RESTORE_DATE" ]; then
    echo "ERROR: --restore requires --date=YYYY-MM-DD" >&2
    exit 2
  fi
  FILENAME="backup-$RESTORE_DATE.sql.gz"
  FILE="$BACKUP_DIR/$FILENAME"

  if [ ! -f "$FILE" ]; then
    echo "Local backup not found, checking ${RCLONE_REMOTE}:${RCLONE_BACKUP_FOLDER} ..."
    if rclone lsf "${RCLONE_REMOTE}:${RCLONE_BACKUP_FOLDER}" | grep -Fxq "$FILENAME"; then
      rclone copyto "${RCLONE_REMOTE}:${RCLONE_BACKUP_FOLDER}/${FILENAME}" "$FILE"
    else
      echo "ERROR: backup not found locally or on Drive: $FILENAME" >&2
      echo "Run: rclone lsf ${RCLONE_REMOTE}:${RCLONE_BACKUP_FOLDER}   to see what's available" >&2
      exit 3
    fi
  fi

  if [ "$CONFIRM" != true ]; then
    echo "This will REPLACE all three databases (expense_tracker, keycloak, metabase) with the contents of:"
    echo "  $FILE"
    echo "Re-run with --yes to confirm."
    exit 1
  fi

  echo "Restoring full cluster from $RESTORE_DATE ..."
  # NOTE: cannot use -v ON_ERROR_STOP=1 here. pg_dumpall --clean always emits statements
  # dropping/recreating the bootstrap role we're connected through to replay the script, and
  # Postgres always refuses those ("current user cannot be dropped", "role ... already exists")
  # -- expected and harmless, but with ON_ERROR_STOP either one would abort the ENTIRE restore
  # right there, potentially after real databases have already been dropped but before they're
  # recreated. Instead: let the whole script run, then fail loudly on any OTHER error that isn't
  # one of these two known-benign cases (verified against a real restore into an isolated
  # instance -- both the schema and data come back correctly despite these two lines).
  RESTORE_LOG=$(mktemp)
  gunzip -c "$FILE" | psql "host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=postgres user=$POSTGRES_USER" 2>&1 | tee "$RESTORE_LOG"
  UNEXPECTED_ERRORS=$(grep '^ERROR:' "$RESTORE_LOG" | grep -v -e 'current user cannot be dropped' -e 'role ".*" already exists' || true)
  rm -f "$RESTORE_LOG"
  if [ -n "$UNEXPECTED_ERRORS" ]; then
    echo "Restore encountered unexpected errors:" >&2
    echo "$UNEXPECTED_ERRORS" >&2
    exit 4
  fi
  echo "Restore complete."
else
  FILENAME="backup-$DATE.sql.gz"
  FILE="$BACKUP_DIR/$FILENAME"
  echo "Creating full cluster backup: $FILE"
  pg_dumpall -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" --clean --if-exists | gzip > "$FILE"
  echo "Backup complete."

  echo "Uploading to ${RCLONE_REMOTE}:${RCLONE_BACKUP_FOLDER}/${FILENAME} ..."
  rclone copyto "$FILE" "${RCLONE_REMOTE}:${RCLONE_BACKUP_FOLDER}/${FILENAME}"

  echo "Rotating backups older than ${BACKUP_RETENTION_DAYS:-7} days ..."
  rclone delete "${RCLONE_REMOTE}:${RCLONE_BACKUP_FOLDER}" --min-age "${BACKUP_RETENTION_DAYS:-7}d"

  echo "Done: $FILENAME"
fi

#!/bin/sh
set -e

# Environment variables expected:
# POSTGRES_HOST (default: postgres)
# POSTGRES_PORT (default: 5432)
# POSTGRES_DB
# POSTGRES_USER
# PGPASSWORD (for authentication)
# BACKUP_DIR (default: /backup)

POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
BACKUP_DIR=${BACKUP_DIR:-/backup}
DATE=$(date +%F)

usage() {
  echo "Postgres backup/restore utility"
  echo "Usage (backup):   docker compose run --rm pg-backup"
  echo "Usage (restore):  docker compose run --rm pg-backup --restore --date=YYYY-MM-DD"
  exit 1
}

# Parse args
RESTORE_MODE=false
RESTORE_DATE=""
for arg in "$@"; do
  case $arg in
    --restore) RESTORE_MODE=true ;;
    --date=*) RESTORE_DATE="${arg#*=}" ;;
    --help|-h) usage ;;
  esac
done

mkdir -p "$BACKUP_DIR"

if [ "$RESTORE_MODE" = true ]; then
  if [ -z "$RESTORE_DATE" ]; then
    echo "ERROR: --restore requires --date=YYYY-MM-DD" >&2
    exit 2
  fi
  FILE="$BACKUP_DIR/backup-$RESTORE_DATE.sql.gz"
  if [ ! -f "$FILE" ]; then
    echo "ERROR: Backup file not found: $FILE" >&2
    exit 3
  fi
  echo "Restoring backup from $RESTORE_DATE ..."
  gunzip -c "$FILE" | psql "host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DB user=$POSTGRES_USER" -v ON_ERROR_STOP=1
  echo "Restore complete."
else
  FILE="$BACKUP_DIR/backup-$DATE.sql.gz"
  echo "Creating full backup: $FILE"
  pg_dump "host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DB user=$POSTGRES_USER" | gzip > "$FILE"
  echo "Backup complete." 
fi

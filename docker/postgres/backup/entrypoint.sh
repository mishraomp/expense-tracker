#!/usr/bin/env bash
set -euo pipefail

printenv | grep -E '^(POSTGRES_|PGPASSWORD|RCLONE_|BACKUP_RETENTION_DAYS)' | sed 's/^/export /' > /scripts/env.sh
chmod 0600 /scripts/env.sh

exec cron -f

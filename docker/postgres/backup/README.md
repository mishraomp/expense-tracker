# Backup
One-off backup (in addition to the scheduled cron job). Dumps all three databases, gzips them to `./backups`, uploads to the configured rclone remote, and prunes remote backups older than `BACKUP_RETENTION_DAYS`.
`podman compose run --no-deps --rm pg-backup /scripts/backup.sh`

## Windows Podman Compose Setup
If `podman compose` cannot find `docker-compose` or `podman-compose`, run this once in PowerShell:

```powershell
py -m pip install --user podman-compose
$scripts = py -c "import sysconfig; print(sysconfig.get_path('scripts', scheme='nt_user'))"
$provider = Join-Path $scripts 'podman-compose.exe'
[Environment]::SetEnvironmentVariable('PODMAN_COMPOSE_PROVIDER', $provider, 'User')
```

Open a new terminal after setting the user environment variable. To use the provider immediately in the current terminal, run:

```powershell
$env:PODMAN_COMPOSE_PROVIDER = [Environment]::GetEnvironmentVariable('PODMAN_COMPOSE_PROVIDER', 'User')
podman compose config --services
```

# Restore
Requires the target date file to exist under backups.
`podman compose run --no-deps --rm pg-backup /scripts/backup.sh --restore --date=2025-11-17 --yes`

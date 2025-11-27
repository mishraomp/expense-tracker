<#
.SYNOPSIS
    Configures the Expense Tracker environment on first installation.

.DESCRIPTION
    This script performs initial setup tasks:
    - Initializes PostgreSQL data directory
    - Creates databases (expense_tracker, keycloak)
    - Runs Flyway migrations
    - Imports Keycloak realm configuration

.PARAMETER Action
    The action to perform: InitDB, Migrate, ImportRealm, or All

.NOTES
    Must be run as Administrator.
#>

[CmdletBinding()]
param(
    [ValidateSet('InitDB', 'Migrate', 'ImportRealm', 'All')]
    [string]$Action = 'All',
    
    [string]$InstallDir = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

$PgBin = "$InstallDir\postgres\bin"
$PgData = "$InstallDir\data\pgdata"
$FlywayBin = "$InstallDir\flyway"
$MigrationsDir = "$InstallDir\migrations"
$KeycloakDir = "$InstallDir\keycloak-server"
$RealmFile = "$InstallDir\keycloak-config\realm-export.json"

$PostgresPassword = "expense_tracker_pg"
$Databases = @(
    @{ Name = "expense_tracker"; User = "expense_tracker"; Password = "expense_tracker_db" }
    @{ Name = "keycloak"; User = "keycloak"; Password = "keycloak_db" }
)

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Step {
    param([string]$Message)
    Write-Host "`n→ $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Initialize-PostgreSQL {
    Write-Step "Initializing PostgreSQL database cluster"
    
    if (Test-Path "$PgData\PG_VERSION") {
        Write-Host "  Database cluster already exists at: $PgData"
        return
    }
    
    # Create data directory
    if (-not (Test-Path $PgData)) {
        New-Item -ItemType Directory -Path $PgData -Force | Out-Null
    }
    
    # Initialize database
    $env:PGPASSWORD = $PostgresPassword
    & "$PgBin\initdb.exe" -D $PgData -U postgres -E UTF8 --locale=en_US.UTF-8 -A scram-sha-256 --pwfile=<(echo $PostgresPassword)
    
    if ($LASTEXITCODE -ne 0) {
        # Fallback: use a temp file for password
        $pwFile = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $pwFile -Value $PostgresPassword -NoNewline
        & "$PgBin\initdb.exe" -D $PgData -U postgres -E UTF8 -A scram-sha-256 --pwfile=$pwFile
        Remove-Item $pwFile -Force
    }
    
    # Configure pg_hba.conf for local connections
    $hbaPath = "$PgData\pg_hba.conf"
    $hbaContent = @"
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
"@
    Set-Content -Path $hbaPath -Value $hbaContent
    
    # Configure postgresql.conf
    $confPath = "$PgData\postgresql.conf"
    Add-Content -Path $confPath -Value "`nlisten_addresses = '127.0.0.1'"
    Add-Content -Path $confPath -Value "port = 5432"
    Add-Content -Path $confPath -Value "log_destination = 'stderr'"
    Add-Content -Path $confPath -Value "logging_collector = on"
    Add-Content -Path $confPath -Value "log_directory = 'log'"
    
    Write-Success "PostgreSQL initialized"
}

function Start-PostgreSQLTemp {
    Write-Step "Starting PostgreSQL temporarily for setup"
    
    $env:PGPASSWORD = $PostgresPassword
    $pgProcess = Start-Process -FilePath "$PgBin\postgres.exe" -ArgumentList "-D `"$PgData`"" -PassThru -WindowStyle Hidden
    
    # Wait for PostgreSQL to start
    $maxAttempts = 30
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        Start-Sleep -Seconds 1
        $result = & "$PgBin\pg_isready.exe" -h 127.0.0.1 -p 5432 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is ready"
            return $pgProcess
        }
    }
    
    throw "PostgreSQL failed to start within $maxAttempts seconds"
}

function Stop-PostgreSQLTemp {
    param($Process)
    
    Write-Step "Stopping temporary PostgreSQL"
    
    if ($Process -and -not $Process.HasExited) {
        & "$PgBin\pg_ctl.exe" stop -D $PgData -m fast
        Start-Sleep -Seconds 2
    }
    
    Write-Success "PostgreSQL stopped"
}

function New-Databases {
    Write-Step "Creating databases and users"
    
    $env:PGPASSWORD = $PostgresPassword
    
    foreach ($db in $Databases) {
        Write-Host "  Creating database: $($db.Name)"
        
        # Check if database exists
        $exists = & "$PgBin\psql.exe" -h 127.0.0.1 -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($db.Name)'" 2>$null
        
        if (-not $exists) {
            # Create user
            & "$PgBin\psql.exe" -h 127.0.0.1 -U postgres -c "CREATE USER $($db.User) WITH ENCRYPTED PASSWORD '$($db.Password)';" 2>$null
            
            # Create database
            & "$PgBin\psql.exe" -h 127.0.0.1 -U postgres -c "CREATE DATABASE $($db.Name) OWNER $($db.User);"
            
            # Grant privileges
            & "$PgBin\psql.exe" -h 127.0.0.1 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $($db.Name) TO $($db.User);"
            
            Write-Success "Database created: $($db.Name)"
        } else {
            Write-Host "  Database already exists: $($db.Name)"
        }
    }
}

function Invoke-Migrations {
    Write-Step "Running Flyway migrations"
    
    $flywayExe = "$FlywayBin\flyway.cmd"
    if (-not (Test-Path $flywayExe)) {
        $flywayExe = "$FlywayBin\flyway"
    }
    
    $jdbcUrl = "jdbc:postgresql://127.0.0.1:5432/expense_tracker"
    
    & $flywayExe `
        -url="$jdbcUrl" `
        -user="expense_tracker" `
        -password="expense_tracker_db" `
        -locations="filesystem:$MigrationsDir" `
        -baselineOnMigrate=true `
        migrate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migrations completed"
    } else {
        Write-Host "  ⚠ Migrations may have failed. Check logs for details." -ForegroundColor Yellow
    }
}

function Import-KeycloakRealm {
    Write-Step "Preparing Keycloak realm import"
    
    $importDir = "$KeycloakDir\data\import"
    
    if (Test-Path $RealmFile) {
        if (-not (Test-Path $importDir)) {
            New-Item -ItemType Directory -Path $importDir -Force | Out-Null
        }
        
        Copy-Item -Path $RealmFile -Destination $importDir -Force
        Write-Success "Realm file copied to import directory"
        Write-Host "  Realm will be imported on first Keycloak start."
    } else {
        Write-Host "  Realm file not found: $RealmFile" -ForegroundColor Yellow
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║       Expense Tracker - Environment Configuration             ║" -ForegroundColor White
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor White

$pgProcess = $null

try {
    if ($Action -eq 'All' -or $Action -eq 'InitDB') {
        Initialize-PostgreSQL
        $pgProcess = Start-PostgreSQLTemp
        New-Databases
    }
    
    if ($Action -eq 'All' -or $Action -eq 'Migrate') {
        if (-not $pgProcess) {
            $pgProcess = Start-PostgreSQLTemp
        }
        Invoke-Migrations
    }
    
    if ($Action -eq 'All' -or $Action -eq 'ImportRealm') {
        Import-KeycloakRealm
    }
    
    Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                   Configuration Complete                       ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
}
finally {
    if ($pgProcess) {
        Stop-PostgreSQLTemp -Process $pgProcess
    }
}

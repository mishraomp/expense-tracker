<#
.SYNOPSIS
    Installs Expense Tracker Windows services using NSSM.

.DESCRIPTION
    This script creates and configures Windows services for:
    - PostgreSQL database server
    - Keycloak identity server
    - Expense Tracker API (NestJS)
    
    All services are managed using NSSM (Non-Sucking Service Manager).

.NOTES
    Must be run as Administrator.
#>

[CmdletBinding()]
param(
    [string]$InstallDir = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

$Services = @{
    PostgreSQL = @{
        Name = "ExpenseTrackerPostgres"
        DisplayName = "Expense Tracker - PostgreSQL"
        Description = "PostgreSQL database server for Expense Tracker"
        Executable = "$InstallDir\postgres\bin\postgres.exe"
        Arguments = "-D `"$InstallDir\data\pgdata`""
        StartType = "Automatic"
        DependsOn = @()
    }
    Keycloak = @{
        Name = "ExpenseTrackerKeycloak"
        DisplayName = "Expense Tracker - Keycloak"
        Description = "Keycloak identity server for Expense Tracker"
        Executable = "$InstallDir\keycloak-server\bin\kc.bat"
        Arguments = "start --optimized"
        StartType = "Automatic"
        DependsOn = @("ExpenseTrackerPostgres")
        EnvFile = "$InstallDir\config\keycloak.env"
    }
    API = @{
        Name = "ExpenseTrackerAPI"
        DisplayName = "Expense Tracker - API"
        Description = "Expense Tracker NestJS API server"
        Executable = "$InstallDir\nodejs\node.exe"
        Arguments = "$InstallDir\backend\dist\main.js"
        StartType = "Automatic"
        DependsOn = @("ExpenseTrackerPostgres", "ExpenseTrackerKeycloak")
        EnvFile = "$InstallDir\config\expense-tracker.env"
    }
}

$NSSM = "$InstallDir\nssm\nssm.exe"
$LogDir = "$InstallDir\data\logs"

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

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ $Message" -ForegroundColor Yellow
}

function Install-NSSMService {
    param(
        [string]$Name,
        [string]$DisplayName,
        [string]$Description,
        [string]$Executable,
        [string]$Arguments,
        [string]$StartType,
        [string[]]$DependsOn,
        [string]$EnvFile
    )

    Write-Step "Installing service: $DisplayName"

    # Check if service exists
    $existing = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Warning "Service already exists. Removing..."
        & $NSSM stop $Name 2>&1 | Out-Null
        & $NSSM remove $Name confirm 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }

    # Install service
    & $NSSM install $Name $Executable
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install service: $Name"
    }

    # Configure service
    & $NSSM set $Name AppParameters $Arguments
    & $NSSM set $Name DisplayName $DisplayName
    & $NSSM set $Name Description $Description
    & $NSSM set $Name Start "SERVICE_AUTO_START"
    
    # Set working directory
    $workDir = Split-Path $Executable -Parent
    & $NSSM set $Name AppDirectory $workDir

    # Configure logging
    $logFile = Join-Path $LogDir "$Name.log"
    $errFile = Join-Path $LogDir "$Name-error.log"
    & $NSSM set $Name AppStdout $logFile
    & $NSSM set $Name AppStderr $errFile
    & $NSSM set $Name AppRotateFiles 1
    & $NSSM set $Name AppRotateBytes 10485760  # 10MB

    # Set environment variables from file
    if ($EnvFile -and (Test-Path $EnvFile)) {
        $envVars = Get-Content $EnvFile | Where-Object { $_ -match '^\s*[^#]' } | ForEach-Object {
            $_.Trim()
        }
        if ($envVars) {
            & $NSSM set $Name AppEnvironmentExtra ($envVars -join "`n")
        }
    }

    # Set dependencies
    if ($DependsOn -and $DependsOn.Count -gt 0) {
        $depString = $DependsOn -join "/"
        & $NSSM set $Name DependOnService $depString
    }

    # Restart on failure
    & $NSSM set $Name AppExit Default Restart
    & $NSSM set $Name AppRestartDelay 10000  # 10 seconds

    Write-Success "Service installed: $Name"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║       Expense Tracker - Windows Service Installation          ║" -ForegroundColor White
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor White

# Verify running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw "This script must be run as Administrator."
}

# Verify NSSM exists
if (-not (Test-Path $NSSM)) {
    throw "NSSM not found at: $NSSM"
}

# Create log directory
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Install services in order
foreach ($key in @('PostgreSQL', 'Keycloak', 'API')) {
    $svc = $Services[$key]
    Install-NSSMService @svc
}

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   Services Installed Successfully              ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Services created:"
Write-Host "  - ExpenseTrackerPostgres  (PostgreSQL database)"
Write-Host "  - ExpenseTrackerKeycloak  (Identity server)"
Write-Host "  - ExpenseTrackerAPI       (Backend API)"
Write-Host "`nTo start all services, run: Start-ExpenseTracker.cmd"
Write-Host "Logs are available at: $LogDir`n"

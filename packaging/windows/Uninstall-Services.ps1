<#
.SYNOPSIS
    Uninstalls Expense Tracker Windows services.

.DESCRIPTION
    This script stops and removes all Expense Tracker Windows services:
    - Expense Tracker API
    - Keycloak identity server
    - PostgreSQL database server

.NOTES
    Must be run as Administrator.
#>

[CmdletBinding()]
param(
    [string]$InstallDir = $PSScriptRoot
)

$ErrorActionPreference = 'Continue'

$NSSM = "$InstallDir\nssm\nssm.exe"
$Services = @("ExpenseTrackerAPI", "ExpenseTrackerKeycloak", "ExpenseTrackerPostgres")

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║       Expense Tracker - Windows Service Removal               ║" -ForegroundColor White
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor White

# Verify running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Warning: This script should be run as Administrator." -ForegroundColor Yellow
}

foreach ($svcName in $Services) {
    Write-Host "→ Removing service: $svcName" -ForegroundColor Cyan
    
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($svc) {
        # Stop service
        if ($svc.Status -eq 'Running') {
            Write-Host "  Stopping service..."
            Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        
        # Remove using NSSM if available
        if (Test-Path $NSSM) {
            & $NSSM remove $svcName confirm 2>&1 | Out-Null
        } else {
            # Fallback to sc.exe
            sc.exe delete $svcName 2>&1 | Out-Null
        }
        
        Write-Host "  ✓ Service removed" -ForegroundColor Green
    } else {
        Write-Host "  Service not found, skipping." -ForegroundColor Gray
    }
}

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   Services Removed Successfully                ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Note: Data and configuration files were preserved in:"
Write-Host "  - $InstallDir\data\pgdata     (PostgreSQL data)"
Write-Host "  - $InstallDir\config          (Configuration files)"
Write-Host "`nRemove these manually if no longer needed.`n"

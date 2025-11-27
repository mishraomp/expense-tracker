param(
    [string]$ReleaseDir = "./release/backend",
    [string]$OutputDir = "./pkg"
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path -Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')
Push-Location $root

# Build the WiX installer
$wixBin = "C:\Program Files (x86)\WiX Toolset v3.11\bin"
if (-not (Test-Path $wixBin)) { Write-Error "WiX Toolset not found at $wixBin"; exit 1 }

if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

# Replace version placeholder with actual version
$version = git describe --tags --dirty --always | ForEach-Object { $_ -replace '[-_]', '.' }
if (-not $version) { $version = '0.0.0' }

# Compile and link
& "$wixBin\candle.exe" "packaging/windows/ExpenseTracker.wxs" -dVersion=$version -o "$OutputDir\ExpenseTracker.wixobj"
& "$wixBin\light.exe" "$OutputDir\ExpenseTracker.wixobj" -o "$OutputDir\expense-tracker-$version.msi"

Pop-Location

Write-Output "Created MSI in $OutputDir"
<#
.SYNOPSIS
Deletes files in the backups folder older than the `-DaysToKeep` window.

.DESCRIPTION
By default, this script shows a preview of files that would be deleted. To actually delete files, pass `-Force`.

.PARAMETER BackupPath
The path to the backups folder (default is repo's `backups` directory).

.PARAMETER DaysToKeep
Number of days of backups to keep (default 7).

.PARAMETER Force
If specified, actually deletes the files. Without `-Force`, the script only shows a preview of deletions.

.PARAMETER Recurse
Set if you want the script to scan subfolders recursively (default is `true`).

.EXAMPLE
# Preview deletions for the default backups folder
.
  ./scripts/cleanup-backups.ps1

.EXAMPLE
# Actually delete files older than 7 days (default)
.
  ./scripts/cleanup-backups.ps1 -Force

.EXAMPLE
# Delete files older than 14 days in a custom path
.
  ./scripts/cleanup-backups.ps1 -BackupPath C:\my-backups -DaysToKeep 14 -Force
#>

param(
  [string]$BackupPath = "c:\projects\personal\expense-tracker\backups",
  [int]$DaysToKeep = 7,
  [switch]$Force,
  [switch]$Recurse = $true
)

function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Cyan }
function Write-Warn($message) { Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Write-Err($message)  { Write-Host "[ERROR] $message" -ForegroundColor Red }

# Resolve and validate the path
try {
  $fullPath = (Resolve-Path -Path $BackupPath -ErrorAction Stop).Path
} catch {
  Write-Err "Backup path '$BackupPath' does not exist. Aborting."
  exit 1
}

# Compute cutoff date
$cutoffDate = (Get-Date).AddDays(-$DaysToKeep)
Write-Info "Backup folder: $fullPath"
Write-Info "Days to keep: $DaysToKeep (keeping files with LastWriteTime >= $cutoffDate)"
Write-Info "Recursive: $Recurse"

# Retrieve files older than cutoff
$childItemParams = @{
  Path = $fullPath
  File = $true
}
if ($Recurse) { $childItemParams.Add('Recurse', $true) }
$olderFiles = Get-ChildItem @childItemParams | Where-Object { $_.LastWriteTime -lt $cutoffDate }

$totalFiles = $olderFiles.Count
$totalSizeBytes = ($olderFiles | Measure-Object -Property Length -Sum).Sum

if ($totalFiles -eq 0) {
  Write-Info "No files older than $DaysToKeep days found in $fullPath. Nothing to delete."
  exit 0
}

# Show preview summary
$readableSize = if ($totalSizeBytes -gt 0) { [Math]::Round($totalSizeBytes / 1MB, 2) } else { 0 }
Write-Host "\nFound $totalFiles file(s) older than $DaysToKeep days (total ~ $readableSize MB):\n"
$olderFiles | Select-Object FullName, LastWriteTime, @{N='SizeMB';E={[Math]::Round($_.Length/1MB, 3)}} | Format-Table -AutoSize

if (-not $Force) {
  Write-Warn "\nDry-run mode: Use -Force to actually delete the files."
  exit 0
}

# Deletion mode
Write-Info "Deleting $totalFiles files older than $DaysToKeep days..."
$deleted = 0
$freedBytes = 0
foreach ($file in $olderFiles) {
  try {
    $size = $file.Length
    Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop
    $deleted++
    $freedBytes += $size
    Write-Host "Deleted: $($file.FullName) ($([Math]::Round($size/1KB, 2)) KB)"
  } catch {
    Write-Warn "Failed to delete $($file.FullName): $($_.Exception.Message)"
  }
}

$freedMB = [Math]::Round($freedBytes/1MB, 2)
Write-Info "Deletion complete. Files removed: $deleted. Freed space: ${freedMB} MB."

# Optionally, remove empty folders (safe, optional)
$emptyFolders = Get-ChildItem -Path $fullPath -Directory -Recurse | Where-Object {
  (Get-ChildItem -Path $_.FullName -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0
}

if ($emptyFolders.Count -gt 0) {
  Write-Info "Removing $($emptyFolders.Count) empty directories..."
  foreach ($dir in $emptyFolders) {
    try { Remove-Item -LiteralPath $dir.FullName -Force -Recurse -ErrorAction Stop; Write-Host "Removed directory: $($dir.FullName)" } catch { Write-Warn "Could not remove directory: $($dir.FullName) - $($_.Exception.Message)" }
  }
  Write-Info "Removed empty directories."
} else {
  Write-Info "No empty directories found to remove."
}

exit 0

param(
    [string]$InstallDir = "C:\Program Files\ExpenseTracker\backend",
    [string]$ServiceName = "ExpenseTracker",
    [string]$BinPath = "C:\Program Files\ExpenseTracker\backend\dist\main.js"
)

Write-Host "Installing service $ServiceName for $BinPath"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js not found in PATH. Service will not function until Node is installed."
}

$exePath = "$($node.Source) $BinPath"

# Use sc.exe to create service
sc.exe create $ServiceName binPath= "$exePath" start= auto
sc.exe description $ServiceName "Expense Tracker API service"
sc.exe start $ServiceName || Write-Host "Failed to start service. It may require manual start or admin privileges."

exit 0

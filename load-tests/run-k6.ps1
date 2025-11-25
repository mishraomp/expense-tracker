Param(
  [string]$Script = 'reports.js',
  [string]$BaseUrl = 'http://localhost:3000',
  [int]$Vus = 10,
  [string]$Duration = '30s'
)

$scriptPath = Join-Path $PSScriptRoot $Script
if (-not (Test-Path $scriptPath)) { Write-Error "Script not found: $scriptPath"; exit 1 }

Write-Host "Running k6 script: $scriptPath against $BaseUrl with VUs=$Vus duration=$Duration"
docker run --rm --network host -e BASE_URL=$BaseUrl -e K6_VUS=$Vus -e K6_DURATION=$Duration -v "$PSScriptRoot:/load-tests" loadimpact/k6:0.43.0 run /load-tests/$Script

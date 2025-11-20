param(
  [Parameter(Position=0, Mandatory=$true)]
  [ValidateSet('start','stop')]
  [string]$Action
)

# Root script path
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$composeFile = Join-Path $root 'docker-compose.yml'
$pidFile = Join-Path $root '.expense-tracker-pids.json'

function Write-Log($msg) {
  Write-Host "[manage-services] $msg"
}


function StartService($service) {
  Write-Log "Starting service: $service"
  & docker compose -f $composeFile up -d $service | Out-Null
}

function StopService($service) {
  Write-Log "Stopping service: $service"
  & docker compose -f $composeFile stop $service | Out-Null
}

function WaitForHealthy($service, $port = $null, [int]$timeoutSeconds = 120) {
  $step = 3
  $elapsed = 0
  while ($elapsed -lt $timeoutSeconds) {
    $cid = (& docker compose -f $composeFile ps -q $service) -join ''
    if ($cid) {
      $state = (& docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $cid) -join ''
      if ($state -eq 'healthy' -or $state -eq 'running') {
        Write-Log "$service status: $state"
        return $true
      }
    }

    if ($port) {
      $res = Test-NetConnection -ComputerName 'localhost' -Port $port -WarningAction SilentlyContinue
      if ($res.TcpTestSucceeded) {
        Write-Log "$service port $port is open"
        return $true
      }
    }

    Start-Sleep -Seconds $step
    $elapsed += $step
  }
  Write-Log "$service did not report healthy in $timeoutSeconds seconds"
  return $false
}

function StartNodeFor($name, $prefixPath, $npmScript) {
  Write-Log "Starting node app ($name) in: $prefixPath -- script: $npmScript"
  $arg = "--prefix $prefixPath run $npmScript"

  # Ensure logs dir exists
  $logsDir = Join-Path $root 'logs'
  if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

  $stdout = Join-Path $logsDir "$name.stdout.log"
  $stderr = Join-Path $logsDir "$name.stderr.log"

  # Start the process with stdout/stderr redirected to files so we can tail logs
  $proc = Start-Process -FilePath 'npm' -ArgumentList $arg -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr

  Write-Log "$name logs -> $stdout (stdout) | $stderr (stderr)"

  return @{ pid = $proc.Id; stdout = $stdout; stderr = $stderr }
}

function KillPid($processId) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
    Write-Log "Stopped PID $processId"
    return $true
  } catch {
    Write-Log "PID $processId not found or could not be killed"
    return $false
  }
}

function KillNodeFallback($search) {
  # Try to find node processes with front/back path in their command line
  $found = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match $search }
  foreach ($proc in $found) {
    try { Stop-Process -Id $proc.ProcessId -Force; Write-Log "Killed node.exe pid $($proc.ProcessId) (matched: $search)" } catch { }
  }
}

if ($Action -eq 'stop') {
  # STOP order should be: metabase -> keycloak -> pg-backup-cron -> postgres -> stop node processes
  StopService metabase
  StopService keycloak
  StopService postgres

  # Stop node processes (backend, frontend)
  if (Test-Path $pidFile) {
    $content = Get-Content $pidFile -Raw | ConvertFrom-Json
    if ($content.backendPid) { KillPid $content.backendPid }
    if ($content.frontendPid) { KillPid $content.frontendPid }
    # Optionally show last few lines from logs
    if ($content.backendStdOut -and (Test-Path $content.backendStdOut)) {
      Write-Log "Last 20 lines of backend stdout:"
      Get-Content $content.backendStdOut -Tail 20 | ForEach-Object { Write-Host $_ }
    }
    if ($content.frontendStdOut -and (Test-Path $content.frontendStdOut)) {
      Write-Log "Last 20 lines of frontend stdout:"
      Get-Content $content.frontendStdOut -Tail 20 | ForEach-Object { Write-Host $_ }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  } else {
    Write-Log "PID file not found; attempting fallback node kill"
    KillNodeFallback 'frontend|backend'
  }

  Write-Log "Stop sequence completed"

} elseif ($Action -eq 'start') {

  StartService postgres
  sleep 10
  StartService keycloak
  sleep 10
  StartService metabase
  sleep 10
  # Start backup
  StartService pg-backup

  # Now start Node processes: backend then frontend
  $backendRun = StartNodeFor 'backend' './backend' 'start:dev'
  $backendPid = $backendRun.pid
  Start-Sleep -Seconds 2
  $frontendRun = StartNodeFor 'frontend' './frontend' 'dev'
  $frontendPid = $frontendRun.pid

  # Save PIDs
  $o = @{backendPid = $backendPid; backendStdOut = $backendRun.stdout; backendStdErr = $backendRun.stderr; frontendPid = $frontendPid; frontendStdOut = $frontendRun.stdout; frontendStdErr = $frontendRun.stderr} | ConvertTo-Json
  Set-Content -Path $pidFile -Value $o

  Write-Log "Start sequence completed (backendPid=$backendPid, frontendPid=$frontendPid)"
}

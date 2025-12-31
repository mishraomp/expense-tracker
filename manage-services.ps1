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

function IsServiceRunning($service) {
  $cid = (& docker compose -f $composeFile ps -q $service 2>$null) -join ''
  if (-not $cid) { return $false }
  $state = (& docker inspect -f '{{.State.Status}}' $cid 2>$null) -join ''
  return ($state -eq 'running')
}

function StartServiceIfNotRunning($service) {
  if (IsServiceRunning $service) {
    Write-Log "$service is already running, skipping start"
    return $true
  }
  Write-Log "Starting service: $service"
  & docker compose -f $composeFile up -d $service | Out-Null
  return $?
}

function RunFlywayMigrate() {
  Write-Log "Running Flyway migrations..."
  & docker compose -f $composeFile run --rm flyway | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: Flyway migration failed"
    return $false
  }
  Write-Log "Flyway migrations applied"
  return $true
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

function BuildApp($name, $prefixPath, [switch]$Production) {
  Write-Log "Building $name..."
  $script = if ($Production -and $name -eq 'backend') { 'build:prod' } else { 'build' }
  $buildResult = & npm --prefix $prefixPath run $script 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: Failed to build $name"
    Write-Host $buildResult
    return $false
  }
  Write-Log "$name built successfully"
  return $true
}

function LoadEnvFile($envFilePath) {
  # Load .env file and return hashtable of environment variables
  $envVars = @{}
  if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
      $line = $_.Trim()
      # Skip empty lines and comments
      if ($line -and -not $line.StartsWith('#')) {
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
          $key = $parts[0].Trim()
          $value = $parts[1].Trim()
          # Remove surrounding quotes if present
          if (($value.StartsWith('"') -and $value.EndsWith('"')) -or 
              ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
          }
          $envVars[$key] = $value
        }
      }
    }
    Write-Log "Loaded $(($envVars.Keys).Count) environment variables from $envFilePath"
  } else {
    Write-Log "Warning: .env file not found at $envFilePath"
  }
  return $envVars
}

function StartBackendProduction($envFilePath) {
  Write-Log "Starting backend in PRODUCTION mode..."
  
  $backendPath = Join-Path $root 'backend'
  $logsDir = Join-Path $root 'logs'
  if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

  $stdout = Join-Path $logsDir 'backend.stdout.log'
  $stderr = Join-Path $logsDir 'backend.stderr.log'

  # Load environment variables from .env and set them in current process
  $envVars = LoadEnvFile $envFilePath
  
  # Set NODE_ENV to production
  $envVars['NODE_ENV'] = 'production'

  # Set environment variables in current process (child will inherit)
  foreach ($key in $envVars.Keys) {
    [System.Environment]::SetEnvironmentVariable($key, $envVars[$key], [System.EnvironmentVariableTarget]::Process)
  }

  $mainJs = Join-Path $backendPath 'dist'
  $mainJs = Join-Path $mainJs 'main.js'
  
  if (-not (Test-Path $mainJs)) {
    Write-Log "ERROR: Backend dist/main.js not found. Run build first."
    return $null
  }

  # Use Start-Process which handles background processes better in PowerShell 5.1
  # Limit Node.js heap to 128MB for this simple app
  $nodeArgs = "--max-old-space-size=128 $mainJs"
  $proc = Start-Process -FilePath 'node' -ArgumentList $nodeArgs -WorkingDirectory $backendPath -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr

  Write-Log "Backend (production) started with PID $($proc.Id)"
  Write-Log "Backend logs -> $stdout (stdout) | $stderr (stderr)"

  return @{ pid = $proc.Id; stdout = $stdout; stderr = $stderr }
}

function StartFrontendDev($prefixPath) {
  Write-Log "Starting frontend dev server..."
  $arg = "--prefix $prefixPath run dev"

  $logsDir = Join-Path $root 'logs'
  if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

  $stdout = Join-Path $logsDir 'frontend.stdout.log'
  $stderr = Join-Path $logsDir 'frontend.stderr.log'

  $proc = Start-Process -FilePath 'npm' -ArgumentList $arg -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr

  Write-Log "Frontend logs -> $stdout (stdout) | $stderr (stderr)"

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
  # First, kill any process listening on port 3000 (the actual server)
  $port3000Line = netstat -aon | findstr "LISTENING" | findstr ":3000" | Select-Object -First 1
  if ($port3000Line) {
    $serverPid = ($port3000Line -split '\s+' | Select-Object -Last 1)
    if ($serverPid -and $serverPid -ne '0') {
      Write-Log "Killing server process on port 3000 (PID: $serverPid)"
      KillPid ([int]$serverPid)
    }
  }

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

  # Start Docker services (skip if already running)
  StartServiceIfNotRunning postgres

  if (-not (RunFlywayMigrate)) {
    Write-Log "ERROR: Database migrations failed. Aborting."
    exit 1
  }
  
  StartServiceIfNotRunning keycloak
  
  StartServiceIfNotRunning metabase
  StartServiceIfNotRunning pg-backup

  # Build frontend first
  $frontendPath = Join-Path $root 'frontend'
  if (-not (BuildApp 'frontend' $frontendPath)) {
    Write-Log "ERROR: Frontend build failed. Aborting."
    exit 1
  }

  # Copy frontend build to backend/public for production serving
  $frontendDist = Join-Path $frontendPath 'dist'
  $backendPath = Join-Path $root 'backend'
  $backendPublic = Join-Path $backendPath 'public'
  
  if (Test-Path $backendPublic) {
    Remove-Item -Path $backendPublic -Recurse -Force
  }
  
  Write-Log "Copying frontend build to backend/public..."
  Copy-Item -Path $frontendDist -Destination $backendPublic -Recurse
  Write-Log "Frontend assets copied to backend/public"

  # Build backend with production optimizations (no source maps)
  if (-not (BuildApp 'backend' $backendPath -Production)) {
    Write-Log "ERROR: Backend build failed. Aborting."
    exit 1
  }

  # Start backend in production mode with .env
  $envFile = Join-Path $backendPath '.env'
  $backendRun = StartBackendProduction $envFile
  if (-not $backendRun) {
    Write-Log "ERROR: Failed to start backend. Aborting."
    exit 1
  }
  $backendPid = $backendRun.pid

  # Save PIDs (no separate frontend since backend serves it in production)
  $o = @{
    backendPid = $backendPid
    backendStdOut = $backendRun.stdout
    backendStdErr = $backendRun.stderr
    frontendPid = $null
    frontendStdOut = $null
    frontendStdErr = $null
  } | ConvertTo-Json
  Set-Content -Path $pidFile -Value $o

  Write-Log "=============================================="
  Write-Log "Start sequence completed!"
  Write-Log "Backend (production) running on http://localhost:3000"
  Write-Log "Frontend served by backend at http://localhost:3000"
  Write-Log "API available at http://localhost:3000/api"
  Write-Log "Keycloak at http://localhost:8080"
  Write-Log "=============================================="
}

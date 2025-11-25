# seed-db.ps1
# PowerShell script to seed the database with sample data for k6 load testing
# Usage: ./seed-db.ps1 -ExpenseCount 10000 -AttachmentCount 2000 -BaseUrl 'http://localhost:3000'

param(
    [int]$ExpenseCount = 10000,
    [int]$AttachmentCount = 2000,
    [string]$BaseUrl = 'http://localhost:3000',
    [string]$AuthToken = $null,
    [switch]$SkipAuth
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Database Seeding Script ===" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl" -ForegroundColor Gray
Write-Host "Expenses: $ExpenseCount" -ForegroundColor Gray
Write-Host "Attachments: $AttachmentCount" -ForegroundColor Gray
Write-Host ""

# Helper function to make authenticated API calls
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )

    $url = "$BaseUrl$Endpoint"
    
    if (-not $SkipAuth -and $AuthToken) {
        $Headers['Authorization'] = "Bearer $AuthToken"
    }

    $params = @{
        Method = $Method
        Uri = $url
        Headers = $Headers
        ContentType = 'application/json'
    }

    if ($Body) {
        $params['Body'] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Host "Error calling $Method $Endpoint : $_" -ForegroundColor Red
        throw
    }
}

# Generate random date within the last 2 years
function Get-RandomDate {
    $daysAgo = Get-Random -Minimum 1 -Maximum 730
    return (Get-Date).AddDays(-$daysAgo).ToString('yyyy-MM-dd')
}

# Generate random expense data
function New-RandomExpense {
    param([int]$Index)
    
    $categories = @('Groceries', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Dining', 'Education')
    $descriptions = @('Weekly shopping', 'Taxi fare', 'Movie tickets', 'Electric bill', 'Doctor visit', 'Online purchase', 'Restaurant', 'Course fee')
    
    $category = $categories | Get-Random
    $description = $descriptions | Get-Random
    
    return @{
        amount = [math]::Round((Get-Random -Minimum 500 -Maximum 50000) / 100, 2)
        category = $category
        description = "$description #$Index"
        expense_date = Get-RandomDate
    }
}

# Check if backend is accessible
Write-Host "Checking backend connectivity..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -TimeoutSec 5
    Write-Host "✓ Backend is accessible" -ForegroundColor Green
}
catch {
    Write-Host "✗ Backend is not accessible at $BaseUrl" -ForegroundColor Red
    Write-Host "  Make sure the backend is running: cd backend && npm run start:dev" -ForegroundColor Gray
    exit 1
}

# Authentication (if needed)
if (-not $SkipAuth) {
    if (-not $AuthToken) {
        Write-Host ""
        Write-Host "Authentication required. Please provide a valid JWT token:" -ForegroundColor Yellow
        Write-Host "  Option 1: Pass token via -AuthToken parameter" -ForegroundColor Gray
        Write-Host "  Option 2: Use -SkipAuth if backend auth is disabled for testing" -ForegroundColor Gray
        Write-Host "  Option 3: Set `$env:AUTH_TOKEN and re-run" -ForegroundColor Gray
        
        if ($env:AUTH_TOKEN) {
            $AuthToken = $env:AUTH_TOKEN
            Write-Host "Using token from `$env:AUTH_TOKEN" -ForegroundColor Green
        }
        else {
            Write-Host ""
            Write-Host "Exiting. Re-run with -SkipAuth or provide -AuthToken" -ForegroundColor Red
            exit 1
        }
    }
}

# Seed expenses
Write-Host ""
Write-Host "Seeding $ExpenseCount expenses..." -ForegroundColor Yellow
$batchSize = 100
$batchCount = [math]::Ceiling($ExpenseCount / $batchSize)
$successCount = 0
$failCount = 0

for ($batch = 0; $batch -lt $batchCount; $batch++) {
    $start = $batch * $batchSize
    $end = [math]::Min($start + $batchSize, $ExpenseCount)
    $currentBatchSize = $end - $start
    
    Write-Progress -Activity "Seeding Expenses" -Status "Batch $($batch + 1)/$batchCount" -PercentComplete (($batch / $batchCount) * 100)
    
    for ($i = $start; $i -lt $end; $i++) {
        $expense = New-RandomExpense -Index ($i + 1)
        
        try {
            $result = Invoke-ApiRequest -Method POST -Endpoint '/api/v1/expenses' -Body $expense
            $successCount++
            
            if (($successCount % 500) -eq 0) {
                Write-Host "  Created $successCount expenses..." -ForegroundColor Gray
            }
        }
        catch {
            $failCount++
            if ($failCount -le 5) {
                Write-Host "  Failed to create expense $($i + 1): $_" -ForegroundColor Red
            }
        }
    }
    
    Start-Sleep -Milliseconds 100  # Brief pause to avoid overwhelming the API
}

Write-Progress -Activity "Seeding Expenses" -Completed
Write-Host "✓ Created $successCount/$ExpenseCount expenses" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "  $failCount expenses failed" -ForegroundColor Yellow
}

# Seed attachments (optional, requires file upload support)
if ($AttachmentCount -gt 0) {
    Write-Host ""
    Write-Host "Note: Attachment seeding requires manual implementation based on your upload API" -ForegroundColor Yellow
    Write-Host "  Skipping attachment seeding for now. Total requested: $AttachmentCount" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=== Seeding Complete ===" -ForegroundColor Cyan
Write-Host "Successfully created $successCount expenses" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run k6 baseline: ./run-k6.ps1 -Script 'reports.js' -BaseUrl '$BaseUrl'" -ForegroundColor Gray
Write-Host "  2. Save results: k6 run --out json=results/baseline-$(Get-Date -Format 'yyyyMMdd-HHmmss').json load-tests/reports.js" -ForegroundColor Gray
Write-Host ""

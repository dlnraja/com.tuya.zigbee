#!/usr/bin/env pwsh

<#
.SYNOPSIS
Check for duplicate drivers in app.json

.DESCRIPTION
Analyzes app.json to find duplicate driver IDs
#>

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$AppJsonPath = Join-Path $ProjectRoot "app.json"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🔍 CHECK APP.JSON FOR DOUBLONS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $AppJsonPath)) {
    Write-Host "❌ app.json not found! Run 'homey app build' first" -ForegroundColor Red
    exit 1
}

$appJson = Get-Content $AppJsonPath -Raw | ConvertFrom-Json

Write-Host "📦 App: $($appJson.name.en)" -ForegroundColor Cyan
Write-Host "📌 Version: $($appJson.version)" -ForegroundColor Cyan
Write-Host "🔧 Drivers: $($appJson.drivers.Count)" -ForegroundColor Cyan
Write-Host ""

# Check for duplicate driver IDs
$driverIds = @{}
$duplicates = @()

foreach ($driver in $appJson.drivers) {
    if ($driverIds.ContainsKey($driver.id)) {
        $duplicates += $driver.id
        Write-Host "   ❌ DUPLICATE: $($driver.id)" -ForegroundColor Red
    }
    else {
        $driverIds[$driver.id] = $true
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($duplicates.Count -gt 0) {
    Write-Host "❌ FOUND $($duplicates.Count) DUPLICATES!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Duplicate drivers:" -ForegroundColor Yellow
    foreach ($dup in $duplicates | Sort-Object -Unique) {
        Write-Host "   - $dup" -ForegroundColor Red
    }
}
else {
    Write-Host "✅ NO DUPLICATES FOUND!" -ForegroundColor Green
    Write-Host "   All $($appJson.drivers.Count) drivers are unique" -ForegroundColor White
}

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

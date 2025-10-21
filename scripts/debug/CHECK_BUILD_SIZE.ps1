#!/usr/bin/env pwsh

Write-Host "`n🔍 CHECK BUILD SIZE FOR HOMEY`n" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootDir

# Get all files size
$allFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
$fileCount = $allFiles.Count

Write-Host "📊 Total files: $fileCount" -ForegroundColor White
Write-Host "📊 Total size: $totalSizeMB MB`n" -ForegroundColor White

# Check app.json size
$appJsonSize = (Get-Item "app.json").Length
$appJsonSizeMB = [math]::Round($appJsonSize / 1MB, 2)
$appJsonSizeKB = [math]::Round($appJsonSize / 1KB, 2)

Write-Host "📄 app.json: $appJsonSizeKB KB ($appJsonSizeMB MB)" -ForegroundColor $(if ($appJsonSizeMB -gt 5) { "Red" } elseif ($appJsonSizeMB -gt 2) { "Yellow" } else { "Green" })

if ($appJsonSizeMB -gt 5) {
    Write-Host "   ⚠️  WARNING: app.json très gros (> 5MB)" -ForegroundColor Red
    Write-Host "   Peut causer AggregateError sur Homey" -ForegroundColor Red
}

# Check driver count
$appJson = Get-Content "app.json" | ConvertFrom-Json
$driverCount = $appJson.drivers.Count

Write-Host "`n📦 Drivers: $driverCount" -ForegroundColor White

if ($driverCount -gt 300) {
    Write-Host "   ⚠️  WARNING: Beaucoup de drivers (> 300)" -ForegroundColor Yellow
}

# Check flow cards
$flowActions = ($appJson.flow.actions | Get-Member -MemberType NoteProperty).Count
$flowTriggers = ($appJson.flow.triggers | Get-Member -MemberType NoteProperty).Count
$flowConditions = ($appJson.flow.conditions | Get-Member -MemberType NoteProperty).Count

Write-Host "🔄 Flow actions: $flowActions" -ForegroundColor White
Write-Host "🔄 Flow triggers: $flowTriggers" -ForegroundColor White
Write-Host "🔄 Flow conditions: $flowConditions" -ForegroundColor White

$totalFlowCards = $flowActions + $flowTriggers + $flowConditions
Write-Host "🔄 Total flow cards: $totalFlowCards" -ForegroundColor $(if ($totalFlowCards -gt 500) { "Yellow" } else { "Green" })

if ($totalFlowCards -gt 500) {
    Write-Host "   ⚠️  WARNING: Beaucoup de flow cards (> 500)" -ForegroundColor Yellow
    Write-Host "   Peut ralentir build Homey" -ForegroundColor Yellow
}

Write-Host "`n" -NoNewline

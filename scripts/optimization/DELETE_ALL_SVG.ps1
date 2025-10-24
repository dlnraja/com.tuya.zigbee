#!/usr/bin/env pwsh

<#
.SYNOPSIS
Delete ALL SVG files to optimize app size

.DESCRIPTION
SVG files are not needed in Homey SDK3 apps - PNG files are sufficient.
This script removes all SVG files from drivers to reduce app size.
#>

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$DriversPath = Join-Path $ProjectRoot "drivers"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🗑️  DELETE ALL SVG FILES - OPTIMIZATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Find all SVG files
Write-Host "🔍 Scanning for SVG files..." -ForegroundColor Yellow
$svgFiles = Get-ChildItem -Path $DriversPath -Filter "*.svg" -Recurse -File

if ($svgFiles.Count -eq 0) {
    Write-Host "✓ No SVG files found - already optimized!" -ForegroundColor Green
    exit 0
}

# Calculate total size
$totalSize = ($svgFiles | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host ""
Write-Host "📊 Found:" -ForegroundColor White
Write-Host "   Files: $($svgFiles.Count)" -ForegroundColor White
Write-Host "   Size: $totalSizeMB MB" -ForegroundColor White
Write-Host ""

# Group by driver
$byDriver = $svgFiles | Group-Object { $_.Directory.Parent.Name }
Write-Host "📁 Distribution:" -ForegroundColor White
Write-Host "   Drivers with SVG: $($byDriver.Count)" -ForegroundColor White
Write-Host ""

# Delete all SVG files
Write-Host "🗑️  Deleting all SVG files..." -ForegroundColor Yellow

$deleted = 0
foreach ($svg in $svgFiles) {
    try {
        Remove-Item -Path $svg.FullName -Force
        $deleted++
        
        # Progress every 50 files
        if ($deleted % 50 -eq 0) {
            Write-Host "   Deleted: $deleted/$($svgFiles.Count)..." -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "   ⚠️  Failed to delete: $($svg.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ OPTIMIZATION COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor White
Write-Host "   Deleted: $deleted files" -ForegroundColor Green
Write-Host "   Space saved: $totalSizeMB MB" -ForegroundColor Green
Write-Host "   App size reduced: ↓ $totalSizeMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "✓ PNG files remain (SDK3 compliant)" -ForegroundColor Green
Write-Host ""

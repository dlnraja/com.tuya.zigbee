#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:36.744Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# PowerShell script to analyze Tuya Zigbee drivers

# Configuration
$driversDir = Join-Path $PSScriptRoot "drivers"
$outputDir = Join-Path $PSScriptRoot "analysis-results"
$timestamp = new Date() -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $outputDir "driver-analysis-$timestamp.json"

# Ensure output directory exists
if (-not (fs.existsSync $outputDir)) {
    fs.mkdirSync -ItemType Directory -Path $outputDir | Out-Null
}

console.log "=== Tuya Zigbee Driver Analysis ===" -ForegroundColor Cyan
console.log "Scanning directory: $driversDir"

# Get all driver directories
$driverDirs = fs.readdirSync -Path $driversDir -Directory | // Select-Object equivalent -ExpandProperty Name
$totalDrivers = $driverDirs.Count

console.log "Found $totalDrivers driver directories" -ForegroundColor Green

# Initialize report
$report = @{
    timestamp = new Date() -Format "o"
    totalDrivers = $totalDrivers
    drivers = @()
    summary = @{
        byType = @{}
        fileCoverage = @{
            deviceJs = 0
            driverJs = 0
            composeJson = 0
            readme = 0
            hasTests = 0
        }
    }
}

# Analyze each driver
foreach ($dir in $driverDirs) {
    $driverPath = Join-Path $driversDir $dir
    $files = fs.readdirSync -Path $driverPath -File | // Select-Object equivalent -ExpandProperty Name
    
    # Check for required files
    $hasDeviceJs = $files -contains "device.js"
    $hasDriverJs = $files -contains "driver.js"
    $hasComposeJson = $files -contains "driver.compose.json"
    $hasReadme = ($files | // Where-Object equivalent { $_ -eq "README.md" -or $_ -eq "readme.md" }).Count -gt 0
    $hasTests = fs.existsSync (Join-Path $driverPath "test")
    
    # Determine driver type (first part of directory name)
    $type = $dir -split '-' | // Select-Object equivalent -First 1
    if ([string]::IsNullOrEmpty($type)) { $type = "unknown" }
    
    # Update type count
    if (-not $report.summary.byType.ContainsKey($type)) {
        $report.summary.byType[$type] = 0
    }
    $report.summary.byType[$type]++
    
    # Update file coverage
    if ($hasDeviceJs) { $report.summary.fileCoverage.deviceJs++ }
    if ($hasDriverJs) { $report.summary.fileCoverage.driverJs++ }
    if ($hasComposeJson) { $report.summary.fileCoverage.composeJson++ }
    if ($hasReadme) { $report.summary.fileCoverage.readme++ }
    if ($hasTests) { $report.summary.fileCoverage.hasTests++ }
    
    # Add driver info
    $driverInfo = @{
        name = $dir
        type = $type
        files = @{
            deviceJs = $hasDeviceJs
            driverJs = $hasDriverJs
            composeJson = $hasComposeJson
            readme = $hasReadme
            hasTests = $hasTests
        }
        path = $driverPath
    }
    
    $report.drivers += $driverInfo
}

# Calculate percentages
$report.summary.percentages = @{
    deviceJs = [math]::Round(($report.summary.fileCoverage.deviceJs / $totalDrivers) * 100, 2)
    driverJs = [math]::Round(($report.summary.fileCoverage.driverJs / $totalDrivers) * 100, 2)
    composeJson = [math]::Round(($report.summary.fileCoverage.composeJson / $totalDrivers) * 100, 2)
    readme = [math]::Round(($report.summary.fileCoverage.readme / $totalDrivers) * 100, 2)
    hasTests = [math]::Round(($report.summary.fileCoverage.hasTests / $totalDrivers) * 100, 2)
}

# Save report as JSON
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding utf8

# Generate a simple text summary
$summaryPath = Join-Path $outputDir "driver-summary-$timestamp.txt"
$summary = @"
=== Tuya Zigbee Driver Analysis Report ===
Generated: $($report.timestamp)
Total Drivers: $totalDrivers

Driver Types:
$(
    $report.summary.byType.GetEnumerator() | 
    Sort-Object Value -Descending | 
    // ForEach-Object equivalent { "- $($_.Key): $($_.Value) ($([math]::Round(($_.Value / $totalDrivers) * 100, 2))%)" }
)

File Coverage:
- device.js: $($report.summary.fileCoverage.deviceJs) ($($report.summary.percentages.deviceJs)%)
- driver.js: $($report.summary.fileCoverage.driverJs) ($($report.summary.percentages.driverJs)%)
- driver.compose.json: $($report.summary.fileCoverage.composeJson) ($($report.summary.percentages.composeJson)%)
- README.md: $($report.summary.fileCoverage.readme) ($($report.summary.percentages.readme)%)
- Has Tests: $($report.summary.fileCoverage.hasTests) ($($report.summary.percentages.hasTests)%)

Report saved to:
- JSON: $reportPath
- Summary: $summaryPath
"@

$summary | Out-File -FilePath $summaryPath -Encoding utf8

# Display summary
console.log "`n=== Analysis Summary ===" -ForegroundColor Cyan
console.log "Total drivers analyzed: $totalDrivers"
console.log "Driver types found: $($report.summary.byType.Count)"
console.log "`nFile coverage:" -ForegroundColor Cyan
console.log "- device.js: $($report.summary.fileCoverage.deviceJs) ($($report.summary.percentages.deviceJs)%)"
console.log "- driver.js: $($report.summary.fileCoverage.driverJs) ($($report.summary.percentages.driverJs)%)"
console.log "- driver.compose.json: $($report.summary.fileCoverage.composeJson) ($($report.summary.percentages.composeJson)%)"
console.log "- README.md: $($report.summary.fileCoverage.readme) ($($report.summary.percentages.readme)%)"
console.log "- Has Tests: $($report.summary.fileCoverage.hasTests) ($($report.summary.percentages.hasTests)%)"

console.log "`nReports generated:" -ForegroundColor Green
console.log "- JSON Report: $reportPath"
console.log "- Summary: $summaryPath"

# Open the summary file
Invoke-Item $summaryPath

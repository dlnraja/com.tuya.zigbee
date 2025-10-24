#!/usr/bin/env pwsh

#<
.SYNOPSIS
Fix button_wireless_* drivers - Remove manual flow card registration

.DESCRIPTION
SDK3 automatically registers flow cards from driver.flow.compose.json.
Manual registration causes "Invalid Flow Card ID" errors.
#>

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$DriversPath = Join-Path $ProjectRoot "drivers"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🔧 FIX BUTTON DRIVERS - SDK3 COMPLIANCE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Find all button_wireless_* directories
$buttonDrivers = Get-ChildItem -Path $DriversPath -Directory -Filter "button_wireless_*"

Write-Host "📦 Found $($buttonDrivers.Count) button drivers to fix" -ForegroundColor Yellow
Write-Host ""

$fixed = 0
foreach ($driver in $buttonDrivers) {
    $driverJs = Join-Path $driver.FullName "driver.js"
    
    if (-not (Test-Path $driverJs)) {
        Write-Host "   ⚠️  Skipping $($driver.Name) - No driver.js found" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $driverJs -Raw
    
    # Check if it has the problematic registerUniversalFlowCards
    if ($content -match 'registerUniversalFlowCards') {
        Write-Host "   🔧 Fixing $($driver.Name)..." -ForegroundColor Cyan
        
        # Extract class name
        $className = $driver.Name -replace '_', '' -replace 'button', 'Button' -replace 'wireless', 'Wireless'
        $className = $className -replace '(\d+)$', '$1Gang'
        $className += "Driver"
        
        # Create new content
        $newContent = @"
'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class $className extends ZigBeeDriver {

  async onInit() {
    this.log('${className} initialized');
    
    // Flow cards are automatically registered from driver.flow.compose.json in SDK3
    // No manual registration needed
  }
}

module.exports = $className;
"@
        
        # Write new content
        Set-Content -Path $driverJs -Value $newContent -Encoding UTF8 -NoNewline
        
        $fixed++
        Write-Host "   ✅ Fixed $($driver.Name)" -ForegroundColor Green
    }
    else {
        Write-Host "   ✓ $($driver.Name) - Already correct" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ BUTTON DRIVERS FIXED!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor White
Write-Host "   Fixed: $fixed drivers" -ForegroundColor Green
Write-Host "   Total: $($buttonDrivers.Count) drivers" -ForegroundColor White
Write-Host ""

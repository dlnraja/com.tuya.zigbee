#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Master fix script for Homey app - PowerShell version
    
.DESCRIPTION
    Applies all corrections in correct order:
    1. Double suffix folder names
    2. driver.compose.json IDs and paths
    3. Duplicate device args
    4. Orphaned [[device]] refs
    5. app.json rebuild and consistency
    
.EXAMPLE
    .\MASTER_FIX_ALL.ps1
#>

param(
    [switch]$SkipValidation = $false
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         MASTER FIX SCRIPT - Complete Repair Suite         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$startTime = Get-Date
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Results tracking
$results = @{
    FoldersRenamed = 0
    ComposeJsonFixed = 0
    DeviceArgsRemoved = 0
    TitleFormattedFixed = 0
    AppJsonRebuilt = $false
    AppJsonSuffixesFixed = 0
    Validated = $false
}

# ============================================================================
# STEP 1: Fix double suffix folder names
# ============================================================================

Write-Host "🔧 STEP 1: Fixing double suffix folder names`n" -ForegroundColor Yellow

$driversDir = Join-Path $rootDir "drivers"
$drivers = Get-ChildItem $driversDir -Directory

$renames = @()

foreach ($driver in $drivers) {
    $newName = $driver.Name
    $modified = $false
    
    # Apply all suffix fixes
    if ($newName -match '^ikea_ikea_') {
        $newName = $newName -replace '^ikea_ikea_', 'ikea_'
        $modified = $true
    }
    if ($newName -match '_other_other$') {
        $newName = $newName -replace '_other_other$', '_other'
        $modified = $true
    }
    if ($newName -match '_aaa_aaa$') {
        $newName = $newName -replace '_aaa_aaa$', '_aaa'
        $modified = $true
    }
    if ($newName -match '_aa_aa$') {
        $newName = $newName -replace '_aa_aa$', '_aa'
        $modified = $true
    }
    if ($newName -match '_internal_internal$') {
        $newName = $newName -replace '_internal_internal$', '_internal'
        $modified = $true
    }
    
    if ($modified) {
        $renames += @{
            Old = $driver.Name
            New = $newName
            OldPath = $driver.FullName
            NewPath = Join-Path $driversDir $newName
        }
    }
}

if ($renames.Count -gt 0) {
    Write-Host "Found $($renames.Count) folders to rename:`n"
    
    foreach ($rename in $renames) {
        try {
            Rename-Item -Path $rename.OldPath -NewName $rename.New -ErrorAction Stop
            Write-Host "  ✅ $($rename.Old) → $($rename.New)" -ForegroundColor Green
            $results.FoldersRenamed++
        } catch {
            Write-Host "  ❌ Error renaming $($rename.Old): $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ✅ No double suffix folders found" -ForegroundColor Green
}

Write-Host "`n✅ Step 1 complete: $($results.FoldersRenamed) folders renamed`n" -ForegroundColor Green

# ============================================================================
# STEP 2-6: Use Node.js scripts for JSON manipulation
# ============================================================================

Write-Host "🔧 STEP 2-6: Running Node.js fix scripts`n" -ForegroundColor Yellow

try {
    $nodeScript = Join-Path $PSScriptRoot "MASTER_FIX_ALL.js"
    
    if (Test-Path $nodeScript) {
        # Run the Node.js version for steps 2-6
        Write-Host "  📦 Executing Node.js master script..." -ForegroundColor Cyan
        node $nodeScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Node.js scripts completed successfully`n" -ForegroundColor Green
            $results.AppJsonRebuilt = $true
            $results.Validated = $true
        } else {
            Write-Host "`n❌ Node.js scripts failed`n" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠️  Node.js script not found, skipping steps 2-6" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error running Node.js scripts: $_" -ForegroundColor Red
}

# ============================================================================
# SUMMARY
# ============================================================================

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    EXECUTION SUMMARY                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "  ⏱️  Duration: $([math]::Round($duration, 2))s"
Write-Host "  📁 Folders renamed: $($results.FoldersRenamed)"
Write-Host "  🔨 app.json rebuilt: $(if ($results.AppJsonRebuilt) { 'YES' } else { 'NO' })"
Write-Host "  ✅ Validation: $(if ($results.Validated) { 'PASSED' } else { 'FAILED' })"

if ($results.Validated) {
    Write-Host "`n🎉 ALL FIXES APPLIED SUCCESSFULLY!`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some steps failed - review output above`n" -ForegroundColor Yellow
    exit 1
}

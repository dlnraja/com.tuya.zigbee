#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick publish script for Homey app
.DESCRIPTION
    Validates and publishes without version increment prompts
#>

$ErrorActionPreference = "Stop"

Write-Host "🚀 QUICK PUBLISH - Universal Tuya Zigbee" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan

# Step 1: Validate
Write-Host "📋 Step 1: Validation..." -ForegroundColor Yellow
try {
    $validateResult = homey app validate --level publish 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Validation passed!`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Validation failed:" -ForegroundColor Red
        Write-Host $validateResult
        exit 1
    }
} catch {
    Write-Host "❌ Validation error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get current version
$appJson = Get-Content "app.json" | ConvertFrom-Json
$currentVersion = $appJson.version
Write-Host "📦 Current version: v$currentVersion" -ForegroundColor Cyan

# Step 3: Publish with automatic "no" to version update
Write-Host "`n🚀 Step 2: Publishing v$currentVersion..." -ForegroundColor Yellow
Write-Host "   (Auto-responding 'n' to version update prompt)`n" -ForegroundColor Gray

try {
    # Use echo to pipe "n" to homey app publish
    $publishResult = echo "n" | homey app publish 2>&1
    
    if ($publishResult -match "successfully published" -or $publishResult -match "published successfully") {
        Write-Host "`n✅ PUBLICATION SUCCESS!" -ForegroundColor Green
        Write-Host "📦 Version: v$currentVersion" -ForegroundColor Green
        Write-Host "🔗 Check: https://homey.app/apps/" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "`n⚠️  Publication output:" -ForegroundColor Yellow
        Write-Host $publishResult
        
        # Check if it's actually successful despite message
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Publish command completed (exit code 0)" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "`n❌ Publication may have failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "`n❌ Publication error: $_" -ForegroundColor Red
    exit 1
}

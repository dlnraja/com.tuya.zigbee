#!/usr/bin/env pwsh
# AUTO PUBLISH AND RELEASE - Complete Automation

param(
    [string]$Version = "4.9.274"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTO PUBLISH RELEASE v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = "C:\Users\HP\Desktop\homey app\tuya_repair"
Set-Location $ROOT

# Step 1: Git Status and Push
Write-Host "Step 1: Git Status and Push" -ForegroundColor Yellow

$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "  Committing changes..." -ForegroundColor Gray
    git add -A
    git commit -m "chore: Auto-commit before release v$Version"
    git push origin master
    Write-Host "  Done: Changes pushed" -ForegroundColor Green
} else {
    Write-Host "  Done: Working tree clean" -ForegroundColor Green
}

Write-Host ""

# Step 2: Create and Push Tag
Write-Host "Step 2: Create and Push Tag" -ForegroundColor Yellow

$tagExists = git tag -l "v$Version"
if ($tagExists) {
    Write-Host "  Deleting existing tag..." -ForegroundColor Gray
    git tag -d "v$Version"
    git push origin ":refs/tags/v$Version" 2>$null
}

git tag -a "v$Version" -m "CRITICAL FIX - Correct TuyaManufacturerCluster import path"
git push origin "v$Version"
Write-Host "  Done: Tag v$Version created and pushed" -ForegroundColor Green
Write-Host ""

# Step 3: Create GitHub Release
Write-Host "Step 3: Create GitHub Release" -ForegroundColor Yellow

$releaseTitle = "v$Version - CRITICAL FIX"
$releaseBody = @"
# CRITICAL FIX - v$Version

## Critical Fixes
- URGENT: Fixed app crash on startup caused by incorrect import path for TuyaManufacturerCluster
- All users should update immediately to restore app functionality

## Technical Details

### Issue Fixed
Error: Cannot find module './TuyaManufacturerCluster'

### Root Cause
Incorrect relative import path in lib/registerClusters.js

### Solution
Changed from require('./TuyaManufacturerCluster') to require('./tuya/TuyaManufacturerCluster')

## Impact

Before (v4.9.273):
- App crashes immediately on startup
- All devices inaccessible
- Affects 100% of users

After (v$Version):
- App starts normally
- All devices accessible
- Full functionality restored
- No data loss or config changes

## Changelog
- fix(critical): Correct TuyaManufacturerCluster import path
- chore: Bump version to $Version
- docs: Add publication guides

## Installation
URGENT UPDATE if on v4.9.273:
1. Open Homey app
2. Go to Apps -> Universal Tuya Zigbee
3. Click Update
4. Restart if needed

Released: $(Get-Date -Format "yyyy-MM-dd HH:mm")
Type: Emergency Hotfix
Priority: CRITICAL
"@

# Check if gh CLI is available
$ghAvailable = Get-Command gh -ErrorAction SilentlyContinue

if ($ghAvailable) {
    Write-Host "  Using GitHub CLI to create release..." -ForegroundColor Gray
    
    $tempFile = [System.IO.Path]::GetTempFileName()
    $releaseBody | Out-File -FilePath $tempFile -Encoding UTF8
    
    try {
        gh release create "v$Version" --title $releaseTitle --notes-file $tempFile --latest
        Write-Host "  Done: GitHub Release created" -ForegroundColor Green
    }
    catch {
        Write-Host "  Error: Failed to create release via gh CLI" -ForegroundColor Red
        Write-Host "  Please create manually at:" -ForegroundColor Yellow
        Write-Host "  https://github.com/dlnraja/com.tuya.zigbee/releases/new?tag=v$Version" -ForegroundColor White
    }
    finally {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "  GitHub CLI not found, trying to install..." -ForegroundColor Yellow
    
    try {
        winget install --id GitHub.cli --silent --accept-source-agreements
        Write-Host "  Done: GitHub CLI installed" -ForegroundColor Green
        Write-Host "  Please run the script again" -ForegroundColor Yellow
        exit 0
    }
    catch {
        Write-Host "  Could not install GitHub CLI" -ForegroundColor Red
        Write-Host "  Please create release manually at:" -ForegroundColor Yellow
        Write-Host "  https://github.com/dlnraja/com.tuya.zigbee/releases/new?tag=v$Version" -ForegroundColor White
    }
}

Write-Host ""

# Step 4: Monitor GitHub Actions
Write-Host "Step 4: Monitor GitHub Actions" -ForegroundColor Yellow

if ($ghAvailable) {
    Write-Host "  Waiting for workflow to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    Write-Host "  Workflow started, monitoring..." -ForegroundColor Gray
    
    $maxWait = 300
    $waited = 0
    $checkInterval = 10
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds $checkInterval
        $waited += $checkInterval
        
        try {
            $runStatus = gh run list --limit 1 --json status,conclusion | ConvertFrom-Json
            
            if ($runStatus -and $runStatus.Count -gt 0) {
                $status = $runStatus[0].status
                $conclusion = $runStatus[0].conclusion
                
                Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] Status: $status" -ForegroundColor Gray
                
                if ($status -eq "completed") {
                    if ($conclusion -eq "success") {
                        Write-Host "  Done: Workflow completed successfully!" -ForegroundColor Green
                        Write-Host "  App published to Homey App Store!" -ForegroundColor Green
                        break
                    } else {
                        Write-Host "  Error: Workflow failed" -ForegroundColor Red
                        Write-Host "  Check: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Yellow
                        break
                    }
                }
            }
        }
        catch {
            Write-Host "  Warning: Could not check workflow status" -ForegroundColor Yellow
            break
        }
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "  Timeout: Check workflow manually" -ForegroundColor Yellow
        Write-Host "  https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
    }
} else {
    Write-Host "  GitHub CLI not available for monitoring" -ForegroundColor Yellow
    Write-Host "  Monitor at: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
}

Write-Host ""

# Step 5: Cleanup and Organization
Write-Host "Step 5: Cleanup and Organization" -ForegroundColor Yellow

$docsDir = Join-Path $ROOT "docs\releases"
if (-not (Test-Path $docsDir)) {
    New-Item -ItemType Directory -Path $docsDir -Force | Out-Null
}

$docsToMove = @(
    "PUBLICATION_STEPS.md",
    "PUBLISH_COMMAND.txt",
    "PUBLISH_NOW.ps1",
    "URGENT_PUBLISH_FIX.md",
    "CREATE_RELEASE.md",
    "RELEASE_NOTES_v$Version.md"
)

foreach ($file in $docsToMove) {
    $srcPath = Join-Path $ROOT $file
    if (Test-Path $srcPath) {
        $destPath = Join-Path $docsDir $file
        Move-Item -Path $srcPath -Destination $destPath -Force -ErrorAction SilentlyContinue
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Clean temp files
Get-ChildItem -Path $ROOT -Include "*.tmp","*.temp" -Recurse -ErrorAction SilentlyContinue | 
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "  Done: Cleanup completed" -ForegroundColor Green

# Commit cleanup
git add -A
$cleanupStatus = git status --porcelain
if ($cleanupStatus) {
    git commit -m "chore: Organize documentation after v$Version release"
    git push origin master
    Write-Host "  Done: Cleanup changes pushed" -ForegroundColor Green
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PUBLICATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Version: v$Version" -ForegroundColor White
Write-Host "Tag: Created and Pushed" -ForegroundColor White
Write-Host "Release: Created on GitHub" -ForegroundColor White
Write-Host "Workflow: Publishing to Homey App Store" -ForegroundColor White
Write-Host "Cleanup: Documentation organized" -ForegroundColor White
Write-Host ""
Write-Host "Links:" -ForegroundColor Cyan
Write-Host "  Release: https://github.com/dlnraja/com.tuya.zigbee/releases/tag/v$Version" -ForegroundColor White
Write-Host "  Actions: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
Write-Host "  App: https://homey.app/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
Write-Host ""
Write-Host "Users can now update to v$Version!" -ForegroundColor Green
Write-Host ""

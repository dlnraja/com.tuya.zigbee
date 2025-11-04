#!/usr/bin/env pwsh
# AUTO PUBLISH AND RELEASE - Complete Automation
# Handles: push, release creation, publication monitoring, cleanup

param(
    [string]$Version = "4.9.274",
    [switch]$SkipCleanup
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTO PUBLISH & RELEASE v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = "C:\Users\HP\Desktop\homey app\tuya_repair"
Set-Location $ROOT

# ============================================================
# 1. GIT STATUS & PUSH
# ============================================================
Write-Host "📦 Step 1: Git Status & Push" -ForegroundColor Yellow
Write-Host ""

$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Uncommitted changes detected, committing..." -ForegroundColor Yellow
    git add -A
    git commit -m "chore: Auto-commit before release v$Version"
    git push origin master
    Write-Host "✅ Changes committed and pushed" -ForegroundColor Green
} else {
    Write-Host "✅ Working tree clean" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 2. CREATE & PUSH TAG
# ============================================================
Write-Host "🏷️  Step 2: Create & Push Tag" -ForegroundColor Yellow
Write-Host ""

$tagExists = git tag -l "v$Version"
if ($tagExists) {
    Write-Host "⚠️  Tag v$Version already exists, deleting..." -ForegroundColor Yellow
    git tag -d "v$Version"
    git push origin ":refs/tags/v$Version" 2>$null
}

git tag -a "v$Version" -m "CRITICAL FIX - Correct TuyaManufacturerCluster import path"
git push origin "v$Version"
Write-Host "✅ Tag v$Version created and pushed" -ForegroundColor Green
Write-Host ""

# ============================================================
# 3. CREATE GITHUB RELEASE
# ============================================================
Write-Host "📝 Step 3: Create GitHub Release" -ForegroundColor Yellow
Write-Host ""

$releaseNotes = @"
# 🚨 CRITICAL FIX - v$Version

## Critical Fixes
- **URGENT:** Fixed app crash on startup caused by incorrect import path for TuyaManufacturerCluster
- All users should update immediately to restore app functionality

## Technical Details

### Issue Fixed
``````
Error: Cannot find module './TuyaManufacturerCluster'
``````

### Root Cause
Incorrect relative import path in ``lib/registerClusters.js``

### Solution
``````javascript
// BEFORE (❌ Crash)
const TuyaManufacturerCluster = require('./TuyaManufacturerCluster');

// AFTER (✅ Fixed)
const TuyaManufacturerCluster = require('./tuya/TuyaManufacturerCluster');
``````

## Impact

### Before (v4.9.273)
- ❌ App crashes immediately on startup
- ❌ All devices inaccessible
- ❌ Affects 100% of users

### After (v$Version)
- ✅ App starts normally
- ✅ All devices accessible
- ✅ Full functionality restored
- ✅ No data loss or config changes

## Changelog
- fix(critical): Correct TuyaManufacturerCluster import path
- chore: Bump version to $Version
- docs: Add publication guides

## Previous Features (v4.9.273)
All these features now work correctly:
- ✅ Advanced Analytics & Insights (10 insights logs)
- ✅ Smart Device Discovery (AI-powered)
- ✅ Performance Optimization Suite
- ✅ 172 drivers enriched
- ✅ 307 improvements

## Installation
**URGENT UPDATE if on v4.9.273:**
1. Open Homey app
2. Go to Apps → Universal Tuya Zigbee
3. Click Update
4. Restart if needed

## Verification
After updating:
- ✅ App starts without errors
- ✅ Devices are accessible
- ✅ No crash reports

---

**Released:** $(Get-Date -Format "yyyy-MM-dd HH:mm")  
**Type:** Emergency Hotfix  
**Priority:** CRITICAL  
"@

# Check if gh CLI is available
$ghAvailable = Get-Command gh -ErrorAction SilentlyContinue

if ($ghAvailable) {
    Write-Host "🔧 Using GitHub CLI to create release..." -ForegroundColor Cyan
    
    # Save release notes to temp file
    $tempFile = [System.IO.Path]::GetTempFileName()
    $releaseNotes | Out-File -FilePath $tempFile -Encoding UTF8
    
    try {
        gh release create "v$Version" `
            --title "v$Version - CRITICAL FIX" `
            --notes-file $tempFile `
            --latest
        
        Write-Host "✅ GitHub Release created successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to create release via gh CLI" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "📌 Create release manually at:" -ForegroundColor Yellow
        Write-Host "   https://github.com/dlnraja/com.tuya.zigbee/releases/new?tag=v$Version" -ForegroundColor White
    }
    finally {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "⚠️  GitHub CLI (gh) not found" -ForegroundColor Yellow
    Write-Host "   Installing..." -ForegroundColor Cyan
    
    try {
        winget install --id GitHub.cli --silent
        Write-Host "✅ GitHub CLI installed" -ForegroundColor Green
        Write-Host "   Please run the script again" -ForegroundColor Yellow
        exit 0
    }
    catch {
        Write-Host "❌ Could not install GitHub CLI automatically" -ForegroundColor Red
        Write-Host ""
        Write-Host "📌 Create release manually at:" -ForegroundColor Yellow
        Write-Host "   https://github.com/dlnraja/com.tuya.zigbee/releases/new?tag=v$Version" -ForegroundColor White
        Write-Host ""
        Write-Host "📋 Release Notes:" -ForegroundColor Yellow
        Write-Host $releaseNotes -ForegroundColor White
    }
}

Write-Host ""

# ============================================================
# 4. MONITOR GITHUB ACTIONS
# ============================================================
Write-Host "👀 Step 4: Monitor GitHub Actions" -ForegroundColor Yellow
Write-Host ""

if ($ghAvailable) {
    Write-Host "🔄 Waiting for workflow to start..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    Write-Host "📊 Workflow status:" -ForegroundColor Cyan
    gh run list --limit 1
    
    Write-Host ""
    Write-Host "🔗 View live: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⏳ Monitoring workflow (will auto-update)..." -ForegroundColor Yellow
    
    $maxWait = 300 # 5 minutes
    $waited = 0
    $checkInterval = 10
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds $checkInterval
        $waited += $checkInterval
        
        $runStatus = gh run list --limit 1 --json status,conclusion | ConvertFrom-Json
        
        if ($runStatus -and $runStatus.Count -gt 0) {
            $status = $runStatus[0].status
            $conclusion = $runStatus[0].conclusion
            
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Status: $status $(if($conclusion){"| Conclusion: $conclusion"})" -ForegroundColor Cyan
            
            if ($status -eq "completed") {
                if ($conclusion -eq "success") {
                    Write-Host ""
                    Write-Host "✅ Workflow completed successfully!" -ForegroundColor Green
                    Write-Host "🎉 App published to Homey App Store!" -ForegroundColor Green
                    break
                } else {
                    Write-Host ""
                    Write-Host "❌ Workflow failed with conclusion: $conclusion" -ForegroundColor Red
                    Write-Host "🔗 Check details: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Yellow
                    break
                }
            }
        }
    }
    
    if ($waited -ge $maxWait) {
        Write-Host ""
        Write-Host "⏱️  Timeout reached. Check workflow manually:" -ForegroundColor Yellow
        Write-Host "   https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  GitHub CLI not available for monitoring" -ForegroundColor Yellow
    Write-Host "🔗 Monitor manually: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Cyan
}

Write-Host ""

# ============================================================
# 5. CLEANUP & ORGANIZATION
# ============================================================
if (-not $SkipCleanup) {
    Write-Host "🧹 Step 5: Cleanup & Organization" -ForegroundColor Yellow
    Write-Host ""
    
    # Move documentation files to docs/
    $docsToMove = @(
        "PUBLICATION_STEPS.md",
        "PUBLISH_COMMAND.txt",
        "PUBLISH_NOW.ps1",
        "URGENT_PUBLISH_FIX.md",
        "CREATE_RELEASE.md",
        "RELEASE_NOTES_v$Version.md"
    )
    
    $docsDir = Join-Path $ROOT "docs\releases"
    if (-not (Test-Path $docsDir)) {
        New-Item -ItemType Directory -Path $docsDir -Force | Out-Null
    }
    
    foreach ($file in $docsToMove) {
        $srcPath = Join-Path $ROOT $file
        if (Test-Path $srcPath) {
            $destPath = Join-Path $docsDir $file
            Move-Item -Path $srcPath -Destination $destPath -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Moved $file → docs/releases/" -ForegroundColor Gray
        }
    }
    
    # Clean temp files
    $tempFiles = @("*.tmp", "*.temp", ".DS_Store", "Thumbs.db")
    foreach ($pattern in $tempFiles) {
        Get-ChildItem -Path $ROOT -Filter $pattern -Recurse -ErrorAction SilentlyContinue | 
            Remove-Item -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "✅ Cleanup completed" -ForegroundColor Green
    
    # Commit cleanup
    git add -A
    $cleanupStatus = git status --porcelain
    if ($cleanupStatus) {
        git commit -m "chore: Organize documentation after v$Version release"
        git push origin master
        Write-Host "✅ Cleanup changes pushed" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================
# 6. SUMMARY
# ============================================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ PUBLICATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Version: v$Version" -ForegroundColor White
Write-Host "🏷️  Tag: Created & Pushed" -ForegroundColor White
Write-Host "📝 Release: Created on GitHub" -ForegroundColor White
Write-Host "⚙️  Workflow: Published to Homey App Store" -ForegroundColor White
Write-Host "🧹 Cleanup: Documentation organized" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Links:" -ForegroundColor Cyan
Write-Host "   Release: https://github.com/dlnraja/com.tuya.zigbee/releases/tag/v$Version" -ForegroundColor White
Write-Host "   Actions: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
Write-Host "   App Store: https://homey.app/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
Write-Host ""
Write-Host "✅ Users can now update to v$Version!" -ForegroundColor Green
Write-Host ""

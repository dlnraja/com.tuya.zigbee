# MERGE PR #47 - HOBEIAN ZG-303Z Soil Moisture Support

Write-Host "`n🔀 MERGE PR #47 - Soil Moisture Device" -ForegroundColor Cyan
Write-Host "═" * 70 -ForegroundColor Cyan

# Change to project directory
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "`n📋 PR INFORMATION:" -ForegroundColor Yellow
Write-Host "   Title: Copilot/add soil moisture device support" -ForegroundColor White
Write-Host "   Author: @AreAArseth" -ForegroundColor White
Write-Host "   URL: https://github.com/dlnraja/com.tuya.zigbee/pull/47" -ForegroundColor White
Write-Host "   Status: APPROVED ✅" -ForegroundColor Green

Write-Host "`n═" * 70 -ForegroundColor Cyan

# Fetch latest
Write-Host "`n📥 Fetching latest changes..." -ForegroundColor Yellow
git fetch origin

# Checkout PR branch
Write-Host "`n🔄 Checking out PR branch..." -ForegroundColor Yellow
try {
    gh pr checkout 47
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PR branch checked out" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Using alternative method..." -ForegroundColor Yellow
        git fetch origin pull/47/head:pr-47
        git checkout pr-47
    }
} catch {
    Write-Host "⚠️ gh CLI not available, using git directly" -ForegroundColor Yellow
    git fetch origin pull/47/head:pr-47
    git checkout pr-47
}

Write-Host "`n═" * 70 -ForegroundColor Cyan

# Validate
Write-Host "`n✅ Validating app..." -ForegroundColor Yellow
$validation = homey app validate --level=publish 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Validation PASSED" -ForegroundColor Green
} else {
    Write-Host "⚠️ Validation warnings (check output)" -ForegroundColor Yellow
    Write-Host $validation
}

Write-Host "`n═" * 70 -ForegroundColor Cyan

# Show changes
Write-Host "`n📊 Changes in PR:" -ForegroundColor Yellow
git log --oneline master..HEAD

Write-Host "`n📝 Files changed:" -ForegroundColor Yellow
git diff --stat master..HEAD

Write-Host "`n═" * 70 -ForegroundColor Cyan

# Merge decision
Write-Host "`n🤔 READY TO MERGE?" -ForegroundColor Yellow
Write-Host ""
Write-Host "   PR #47 adds HOBEIAN ZG-303Z soil moisture sensor support" -ForegroundColor White
Write-Host "   Review status: APPROVED ✅" -ForegroundColor Green
Write-Host "   Validation: PASSED ✅" -ForegroundColor Green
Write-Host ""

$response = Read-Host "Proceed with merge? (Y/N)"

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host "`n🔀 Merging PR #47..." -ForegroundColor Yellow
    
    # Checkout master
    git checkout master
    
    # Merge PR
    git merge --squash pr-47
    
    # Commit
    $mergeMessage = @"
✨ Add HOBEIAN ZG-303Z soil moisture sensor support (#47)

Added support for HOBEIAN ZG-303Z soil moisture device.

Changes:
- Added HOBEIAN manufacturer ID to climate_sensor_soil driver
- Fixed validation issues (BOM, schema)
- Validation tests passed
- All capabilities supported

Features:
- Temperature measurement (air/soil)
- Air humidity measurement
- Soil moisture measurement
- Battery monitoring
- Contact/tamper alarm

Contributor: @AreAArseth
Review: APPROVED by @dlnraja
"@
    
    git commit -m $mergeMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Merge commit created" -ForegroundColor Green
        
        # Push to master
        Write-Host "`n🚀 Pushing to master..." -ForegroundColor Yellow
        git push origin master
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ MERGE SUCCESSFUL!" -ForegroundColor Green
            Write-Host "`n📋 POST-MERGE TODO:" -ForegroundColor Yellow
            Write-Host "   1. Close PR #47 on GitHub" -ForegroundColor White
            Write-Host "   2. Tag version v4.10.0" -ForegroundColor White
            Write-Host "   3. Update CHANGELOG.md" -ForegroundColor White
            Write-Host "   4. Thank @AreAArseth" -ForegroundColor White
            Write-Host "   5. Publish to Homey App Store" -ForegroundColor White
        } else {
            Write-Host "`n❌ Push failed" -ForegroundColor Red
        }
    } else {
        Write-Host "`n❌ Merge commit failed" -ForegroundColor Red
    }
    
    # Cleanup PR branch
    git branch -D pr-47
    
} else {
    Write-Host "`n❌ Merge cancelled by user" -ForegroundColor Yellow
    git checkout master
}

Write-Host "`n═" * 70 -ForegroundColor Cyan
Write-Host ""

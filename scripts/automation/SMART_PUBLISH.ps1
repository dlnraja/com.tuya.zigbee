#!/usr/bin/env pwsh
# SMART_PUBLISH.ps1
# Publication INTELLIGENTE: Seulement si changements dans drivers/

param(
    [string]$Message = "auto: smart update from driver changes"
)

Write-Host "🤖 SMART PUBLISH - Intelligent Auto-Publishing" -ForegroundColor Cyan
Write-Host "═" * 60 -ForegroundColor Cyan
Write-Host ""

# 1. Détection changements DRIVERS SEULEMENT
Write-Host "🔍 Checking for driver changes..." -ForegroundColor Yellow

$driverChanges = git diff --name-only HEAD | Where-Object { $_ -match "^drivers/" }
$driverStaged = git diff --cached --name-only | Where-Object { $_ -match "^drivers/" }

$hasDriverChanges = ($driverChanges.Count -gt 0) -or ($driverStaged.Count -gt 0)

if (-not $hasDriverChanges) {
    Write-Host "  ℹ️  No driver changes detected" -ForegroundColor Gray
    Write-Host "  📄 Only docs/scripts changed - skipping publish" -ForegroundColor Gray
    
    # Sync GitHub quand même (docs)
    Write-Host "`n📦 Syncing docs to GitHub only..." -ForegroundColor Yellow
    git add -A
    $status = git status --porcelain
    if ($status) {
        git commit -m "docs: $Message"
        git pull origin master --no-rebase
        git push origin master
        Write-Host "  ✅ Docs synced to GitHub" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Nothing to sync" -ForegroundColor Gray
    }
    
    Write-Host "`n✅ DONE - No publish needed (no driver changes)" -ForegroundColor Green
    exit 0
}

# 2. Changements DRIVERS détectés - Publish nécessaire
Write-Host "  🔥 DRIVER CHANGES DETECTED!" -ForegroundColor Red
Write-Host ""
foreach ($file in $driverChanges + $driverStaged | Select-Object -Unique) {
    Write-Host "    📝 $file" -ForegroundColor Yellow
}
Write-Host ""

# 3. Auto-bump version (patch)
Write-Host "📦 Auto-bumping version..." -ForegroundColor Yellow
$appJson = Get-Content "app.json" | ConvertFrom-Json
$currentVersion = $appJson.version
$versionParts = $currentVersion -split '\.'
$versionParts[2] = [int]$versionParts[2] + 1
$newVersion = $versionParts -join '.'

Write-Host "  Version: $currentVersion → $newVersion" -ForegroundColor Cyan

$appJson.version = $newVersion
$appJson | ConvertTo-Json -Depth 100 | Set-Content "app.json"

# Update .homeychangelog.json
$changelog = Get-Content ".homeychangelog.json" | ConvertFrom-Json
$newEntry = @{
    version = $newVersion
    date = (Get-Date -Format "yyyy-MM-dd")
    changes = @{
        en = "Driver improvements from community feedback and automated enrichment"
    }
}
$changelog.PSObject.Properties.Value = @($newEntry) + $changelog.PSObject.Properties.Value
$changelog | ConvertTo-Json -Depth 10 | Set-Content ".homeychangelog.json"

Write-Host "  ✅ Version bumped to $newVersion" -ForegroundColor Green

# 4. Validation Homey
Write-Host "`n🔍 Validating with Homey CLI..." -ForegroundColor Yellow
$validation = homey app validate --level publish 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ VALIDATION FAILED!" -ForegroundColor Red
    Write-Host $validation
    Write-Host "`n⚠️  Reverting version bump..." -ForegroundColor Yellow
    git checkout app.json .homeychangelog.json
    exit 1
}
Write-Host "  ✅ Validation passed" -ForegroundColor Green

# 5. Commit + Push
Write-Host "`n💾 Committing changes..." -ForegroundColor Yellow
git add -A
git commit -m "feat: driver improvements v$newVersion

🔥 DRIVER CHANGES DETECTED

Modified drivers:
$(($driverChanges + $driverStaged | Select-Object -Unique | ForEach-Object { "- $_" }) -join "`n")

Auto-published v$newVersion
Validated: PASS ✅

[smart-publish-auto]"

git pull origin master --no-rebase
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Pull failed - resolve conflicts" -ForegroundColor Red
    exit 1
}

git push origin master
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Push failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Pushed to GitHub" -ForegroundColor Green

# 6. Publish to Homey App Store
Write-Host "`n🚀 Publishing to Homey App Store..." -ForegroundColor Cyan
homey app publish 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Published v$newVersion to Homey App Store!" -ForegroundColor Green
    
    # Tag release
    git tag -a "v$newVersion" -m "Auto-release v$newVersion - Driver improvements"
    git push origin "v$newVersion"
    Write-Host "  ✅ Tagged release v$newVersion" -ForegroundColor Green
    
} else {
    Write-Host "  ⚠️  Publish failed - check manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═" * 60 -ForegroundColor Cyan
Write-Host "✅ SMART PUBLISH COMPLETE!" -ForegroundColor Green
Write-Host "   Version: $newVersion" -ForegroundColor White
Write-Host "   Published: YES (driver changes)" -ForegroundColor White
Write-Host "   Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor Cyan
Write-Host "═" * 60 -ForegroundColor Cyan

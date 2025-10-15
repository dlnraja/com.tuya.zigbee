#!/usr/bin/env pwsh
# PUBLISH_TO_HOMEY.ps1
# Publication MANUELLE vers Homey App Store
# À utiliser SEULEMENT quand version stable prête

param(
    [Parameter(Mandatory=$false)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoConfirm
)

Write-Host "🚀 Homey App Store Publication" -ForegroundColor Cyan
Write-Host "═" * 60 -ForegroundColor Cyan
Write-Host ""

# Vérifications préalables
Write-Host "📋 Pre-publication checks..." -ForegroundColor Yellow

# 1. Check if on master branch
$branch = git branch --show-current
if ($branch -ne "master") {
    Write-Host "❌ Must be on master branch (currently on: $branch)" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ On master branch" -ForegroundColor Green

# 2. Check if working tree is clean
$status = git status --porcelain
if ($status) {
    Write-Host "❌ Working tree must be clean. Commit changes first:" -ForegroundColor Red
    Write-Host $status
    exit 1
}
Write-Host "  ✅ Working tree clean" -ForegroundColor Green

# 3. Validation Homey CLI
Write-Host "`n🔍 Running Homey CLI validation..." -ForegroundColor Yellow
$validationOutput = homey app validate --level publish 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Validation failed!" -ForegroundColor Red
    Write-Host $validationOutput
    
    if (-not $Force) {
        Write-Host "`nUse -Force to publish anyway (NOT RECOMMENDED)" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "⚠️  Force flag used - continuing despite errors" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✅ Validation passed" -ForegroundColor Green
}

# 4. Get current version
$appJson = Get-Content "app.json" | ConvertFrom-Json
$currentVersion = $appJson.version

if ($Version) {
    Write-Host "`n📦 Updating version: $currentVersion → $Version" -ForegroundColor Yellow
    # Update app.json
    $appJson.version = $Version
    $appJson | ConvertTo-Json -Depth 100 | Set-Content "app.json"
    
    # Update .homeychangelog.json
    # (Code to add changelog entry here)
    
    git add app.json .homeychangelog.json
    git commit -m "chore: bump version to $Version"
    git push origin master
    
    $currentVersion = $Version
}

Write-Host "`n📦 Publishing version: $currentVersion" -ForegroundColor Cyan

# Confirmation
Write-Host "`n⚠️  WARNING: This will publish to Homey App Store!" -ForegroundColor Yellow
Write-Host "   Version: $currentVersion" -ForegroundColor White
Write-Host "   Users will receive update notification" -ForegroundColor White
Write-Host ""

if (-not $Force -and -not $AutoConfirm) {
    $confirmation = Read-Host "Continue? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Host "❌ Publication cancelled" -ForegroundColor Red
        exit 0
    }
} elseif ($AutoConfirm) {
    Write-Host "✅ Auto-confirmed (using -AutoConfirm flag)" -ForegroundColor Green
}

# Publication
Write-Host "`n🚀 Publishing to Homey App Store..." -ForegroundColor Cyan
homey app publish

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ PUBLICATION SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Version $currentVersion is now live on Homey App Store" -ForegroundColor Green
    Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor Cyan
    
    # Tag release
    Write-Host "`n🏷️  Creating git tag..." -ForegroundColor Yellow
    git tag -a "v$currentVersion" -m "Release v$currentVersion"
    git push origin "v$currentVersion"
    Write-Host "  ✅ Tag created and pushed" -ForegroundColor Green
    
} else {
    Write-Host "`n❌ PUBLICATION FAILED!" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═" * 60 -ForegroundColor Cyan
Write-Host "🎉 Done!" -ForegroundColor Green

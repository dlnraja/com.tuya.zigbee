# ============================================================================
# OFFICIAL HOMEY APP PUBLICATION SCRIPT
# Based on: https://apps.developer.homey.app/the-basics/app/publishing
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('patch', 'minor', 'major')]
    [string]$VersionType = 'patch',
    
    [Parameter(Mandatory=$false)]
    [string]$Changelog = '',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootPath = Split-Path -Parent (Split-Path -Parent $ScriptPath)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  OFFICIAL HOMEY APP PUBLICATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: PRE-FLIGHT CHECKS
# ============================================================================

Write-Host "📋 Step 1: Pre-flight Checks" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "$RootPath\app.json")) {
    Write-Host "❌ Error: app.json not found in $RootPath" -ForegroundColor Red
    exit 1
}

# Check Node.js installation
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Error: Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

# Check Homey CLI installation
$homeyVersion = npx homey --version 2>$null
if (-not $homeyVersion) {
    Write-Host "❌ Error: Homey CLI not found. Installing..." -ForegroundColor Yellow
    npm install --save-dev homey
}
Write-Host "✅ Homey CLI: $homeyVersion" -ForegroundColor Green

# Read current version
$appJson = Get-Content "$RootPath\app.json" | ConvertFrom-Json
$currentVersion = $appJson.version
Write-Host "📦 Current version: $currentVersion" -ForegroundColor Cyan

Write-Host ""

# ============================================================================
# STEP 2: CLEAN BUILD CACHE
# ============================================================================

Write-Host "🧹 Step 2: Clean Build Cache" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "$RootPath\.homeybuild") {
    Remove-Item "$RootPath\.homeybuild" -Recurse -Force
    Write-Host "✅ Removed .homeybuild" -ForegroundColor Green
}

if (Test-Path "$RootPath\.homeycompose") {
    Remove-Item "$RootPath\.homeycompose" -Recurse -Force
    Write-Host "✅ Removed .homeycompose" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 3: VALIDATE APP
# ============================================================================

if (-not $SkipValidation) {
    Write-Host "✅ Step 3: Validate App (Official Method)" -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $RootPath
    
    Write-Host "Validating at publish level..." -ForegroundColor Cyan
    $validateOutput = npx homey app validate --level publish 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Validation failed:" -ForegroundColor Red
        Write-Host $validateOutput
        Pop-Location
        exit 1
    }
    
    Write-Host "✅ Validation passed" -ForegroundColor Green
    Pop-Location
    Write-Host ""
} else {
    Write-Host "⚠️  Step 3: SKIPPED (--SkipValidation)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 4: PUBLISH TO HOMEY APP STORE
# ============================================================================

Write-Host "🚀 Step 4: Publish to Homey App Store" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - Would execute:" -ForegroundColor Magenta
    Write-Host "   npx homey app publish" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Dry run completed successfully" -ForegroundColor Green
    exit 0
}

Push-Location $RootPath

Write-Host "Publishing app..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  INTERACTIVE PROMPTS:" -ForegroundColor Yellow
Write-Host "   1. Version increment: Choose '$VersionType'" -ForegroundColor Gray
Write-Host "   2. Changelog: Use provided or default message" -ForegroundColor Gray
Write-Host "   3. Commit changes: Choose 'yes' to save version" -ForegroundColor Gray
Write-Host ""

# Execute official publish command
npx homey app publish

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Publication failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host ""
Write-Host "✅ Publication successful!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 5: NEXT STEPS
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  📋 NEXT STEPS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$appId = $appJson.id

Write-Host "1. 🌐 Open Developer Dashboard:" -ForegroundColor Yellow
Write-Host "   https://tools.developer.homey.app" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. 📱 Navigate to:" -ForegroundColor Yellow
Write-Host "   Apps SDK → My Apps → Universal Tuya Zigbee" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. 🎯 Choose Release Type:" -ForegroundColor Yellow
Write-Host "   • Test Release (no certification, private link only)" -ForegroundColor Gray
Write-Host "   • Live Release (submit for Athom certification)" -ForegroundColor Gray
Write-Host ""

Write-Host "🔗 Quick Links:" -ForegroundColor Yellow
Write-Host "   Dashboard: https://tools.developer.homey.app/apps/app/$appId" -ForegroundColor Cyan
Write-Host "   Test URL:  https://homey.app/a/$appId/test/" -ForegroundColor Cyan
Write-Host "   Live URL:  https://homey.app/a/$appId/" -ForegroundColor Cyan
Write-Host ""

Write-Host "============================================" -ForegroundColor Green
Write-Host "  ✅ SCRIPT COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

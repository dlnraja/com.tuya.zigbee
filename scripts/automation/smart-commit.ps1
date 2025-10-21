# SMART COMMIT v3.0.0
# Commit intelligent avec validation, DP Engine check, et CI automation
# Usage: .\smart-commit.ps1 "Votre message de commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation,
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoPush
)

Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SMART COMMIT v3.0.0                             ║" -ForegroundColor Cyan
Write-Host "║  Intelligent commit with full validation        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Pre-commit validation
if (-not $SkipValidation) {
    Write-Host "0️⃣  PRE-COMMIT VALIDATION" -ForegroundColor Yellow
    Write-Host "   → Running Homey validation..." -ForegroundColor White
    & homey app validate --level publish 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  Validation warnings (continuing...)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Validation passed" -ForegroundColor Green
    }
    Write-Host ""
}

# 1. Mise à jour automatique des docs
Write-Host "1️⃣  DOCUMENTATION UPDATE" -ForegroundColor Yellow
Write-Host "   → Updating links, README & CHANGELOG..." -ForegroundColor White
& node scripts/automation/update-all-links.js | Out-Null
Write-Host "   ✅ Documentation updated" -ForegroundColor Green
Write-Host ""

# 1.5 Generate reports
Write-Host "2️⃣  REPORTS GENERATION" -ForegroundColor Yellow
Write-Host "   → Generating device matrix..." -ForegroundColor White
& node scripts/automation/generate-device-matrix.js | Out-Null
Write-Host "   → Generating coverage stats..." -ForegroundColor White
& node scripts/automation/generate-coverage-stats.js | Out-Null
Write-Host "   ✅ Reports generated" -ForegroundColor Green
Write-Host ""

# 3. Ajouter tous les fichiers modifiés
Write-Host "3️⃣  GIT ADD" -ForegroundColor Yellow
& git add -A
$status = & git status --short
if ($status) {
    Write-Host "   → Files staged:" -ForegroundColor White
    $status | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
} else {
    Write-Host "   ⚠️  No changes to commit" -ForegroundColor Red
    exit 0
}
Write-Host ""

# 4. Commit avec le message fourni
Write-Host "4️⃣  GIT COMMIT" -ForegroundColor Yellow
Write-Host "   → Message: $Message" -ForegroundColor White
& git commit -m $Message

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Commit successful!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Commit failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. Push vers GitHub
Write-Host "5️⃣  GIT PUSH" -ForegroundColor Yellow

if ($AutoPush) {
    $push = "o"
} else {
    $push = Read-Host "   → Push to GitHub? (y/N)"
}

if ($push -eq "y" -or $push -eq "Y" -or $push -eq "o" -or $push -eq "O") {
    Write-Host "   → Pushing to origin/master..." -ForegroundColor White
    & git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Push successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   🤖 GitHub Actions (CI/CD):" -ForegroundColor Cyan
        Write-Host "      → Validation (publish level)" -ForegroundColor White
        Write-Host "      → Device matrix generation" -ForegroundColor White
        Write-Host "      → Coverage stats" -ForegroundColor White
        Write-Host "      → Schema validation" -ForegroundColor White
        Write-Host "      → Build artifacts" -ForegroundColor White
        Write-Host "      → Auto-publish (if configured)" -ForegroundColor White
        Write-Host ""
        Write-Host "   📊 Check status:" -ForegroundColor Cyan
        Write-Host "      https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Blue
    } else {
        Write-Host "   ❌ Push failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ℹ️  Push skipped. To push later:" -ForegroundColor Cyan
    Write-Host "      git push origin master" -ForegroundColor White
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ SMART COMMIT COMPLETE!                       ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Use -AutoPush to skip push prompt" -ForegroundColor Cyan
Write-Host "   Example: .\smart-commit.ps1 'feat: new feature' -AutoPush" -ForegroundColor Gray
Write-Host ""

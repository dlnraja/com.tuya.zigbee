#!/usr/bin/env pwsh
# SMART_COMMIT.ps1
# Commit intelligent: organise docs + commit + push GitHub SEULEMENT
# NOTE: Ne publie PAS vers Homey App Store automatiquement
# Pour publier vers Homey: pwsh scripts/automation/PUBLISH_TO_HOMEY.ps1

param(
    [string]$Message = "chore: auto commit with organized docs"
)

Write-Host "🚀 Smart Commit Starting..." -ForegroundColor Cyan
Write-Host ""

# 1. Organiser les docs
Write-Host "📁 Step 1: Organizing documentation..." -ForegroundColor Yellow
& "$PSScriptRoot/AUTO_ORGANIZE_DOCS.ps1"

# 2. Git add
Write-Host "`n📦 Step 2: Staging changes..." -ForegroundColor Yellow
git add -A

# Vérifier s'il y a des changements
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "  ✅ No changes to commit" -ForegroundColor Gray
    Write-Host ""
    
    # Vérifier si on est en avance
    $ahead = git rev-list --count origin/master..HEAD 2>$null
    if ($ahead -gt 0) {
        Write-Host "⚡ Step 3: Pushing $ahead commit(s)..." -ForegroundColor Yellow
        git push origin master
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Pushed successfully!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Push failed" -ForegroundColor Red
            exit 1
        }
    }
    exit 0
}

# 3. Commit
Write-Host "`n💾 Step 3: Committing..." -ForegroundColor Yellow
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Commit failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Committed" -ForegroundColor Green

# 4. Pull (no rebase)
Write-Host "`n⬇️  Step 4: Pulling from remote..." -ForegroundColor Yellow
git pull origin master --no-rebase
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Pull failed - resolve conflicts manually" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Pulled" -ForegroundColor Green

# 5. Push
Write-Host "`n⬆️  Step 5: Pushing to remote..." -ForegroundColor Yellow
git push origin master
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Pushed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Smart Commit Complete!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Push failed" -ForegroundColor Red
    exit 1
}

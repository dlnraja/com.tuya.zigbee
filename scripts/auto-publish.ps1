# Auto-Publish to Homey App Store with GitHub Actions
# Usage: .\scripts\auto-publish.ps1

param(
    [string]$Message = "Release"
)

Write-Host "🚀 AUTO-PUBLISH TO HOMEY APP STORE" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Get current version
$appJson = Get-Content "app.json" | ConvertFrom-Json
$version = $appJson.version
Write-Host "📌 Current Version: v$version" -ForegroundColor Green
Write-Host ""

# 2. Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️ Uncommitted changes detected:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    $response = Read-Host "Commit these changes? (y/n)"
    if ($response -eq "y") {
        git add -A
        git commit -m "chore: prepare v$version for publish - $Message"
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
}

# 3. Pull latest changes
Write-Host "📥 Pulling latest changes..." -ForegroundColor Yellow
git pull origin master --rebase
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to pull changes" -ForegroundColor Red
    exit 1
}

# 4. Create and push tag
Write-Host ""
Write-Host "🏷️ Creating tag v$version..." -ForegroundColor Yellow
git tag -a "v$version" -m "$Message - v$version"

Write-Host "📤 Pushing tag to GitHub..." -ForegroundColor Yellow
git push origin "v$version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Tag might already exist, continuing..." -ForegroundColor Yellow
}

# 5. Trigger publish workflow
Write-Host ""
Write-Host "🎯 Triggering publish workflow..." -ForegroundColor Yellow
gh workflow run publish.yml

# 6. Wait for workflow to start
Write-Host "⏳ Waiting for workflow to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 7. Monitor workflow
Write-Host ""
Write-Host "📊 Monitoring workflow execution..." -ForegroundColor Cyan
$runs = gh run list --workflow=publish.yml --limit 1 --json databaseId | ConvertFrom-Json
if ($runs.Count -gt 0) {
    $runId = $runs[0].databaseId
    Write-Host "🔍 Workflow Run ID: $runId" -ForegroundColor Green
    Write-Host ""
    
    # Watch the run
    gh run watch $runId
    
    # Check final status
    $finalStatus = gh run view $runId --json conclusion | ConvertFrom-Json
    
    if ($finalStatus.conclusion -eq "success") {
        Write-Host ""
        Write-Host "✅ PUBLICATION SUCCESSFUL!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Check: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
        Write-Host "   2. Wait 15-30 minutes for App Store processing" -ForegroundColor White
        Write-Host "   3. Test: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor White
        Write-Host "   4. Monitor diagnostic reports" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ PUBLICATION FAILED!" -ForegroundColor Red
        Write-Host "Check logs: https://github.com/dlnraja/com.tuya.zigbee/actions/runs/$runId" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Could not find workflow run" -ForegroundColor Yellow
    Write-Host "Check manually: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green

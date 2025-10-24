# GIT FORCE PUSH SCRIPT
# Force push to GitHub without rebase/fetch errors

param(
    [string]$CommitMessage = "Auto-commit: Updates and fixes"
)

Write-Host "=== GIT FORCE PUSH SCRIPT ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to repo root
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

# Step 1: Add all changes
Write-Host "[1/5] Adding all changes..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Files added successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to add files" -ForegroundColor Red
    exit 1
}

# Step 2: Commit
Write-Host ""
Write-Host "[2/5] Committing changes..." -ForegroundColor Yellow
git commit -m "$CommitMessage"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changes committed" -ForegroundColor Green
} elseif ($LASTEXITCODE -eq 1) {
    Write-Host "⚠️ Nothing to commit (working tree clean)" -ForegroundColor Yellow
} else {
    Write-Host "❌ Commit failed" -ForegroundColor Red
    exit 1
}

# Step 3: Pull with merge strategy (not rebase)
Write-Host ""
Write-Host "[3/5] Pulling from origin/master with merge..." -ForegroundColor Yellow
git pull origin master --no-rebase --no-edit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pull successful" -ForegroundColor Green
} else {
    Write-Host "⚠️ Pull had conflicts or issues, will try force push" -ForegroundColor Yellow
}

# Step 4: Push (normal)
Write-Host ""
Write-Host "[4/5] Attempting normal push..." -ForegroundColor Yellow
git push origin master
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 ALL DONE! Changes pushed to GitHub" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "⚠️ Normal push failed, trying force push..." -ForegroundColor Yellow
}

# Step 5: Force Push
Write-Host ""
Write-Host "[5/5] FORCE PUSHING to origin/master..." -ForegroundColor Red
Write-Host "⚠️ WARNING: This will overwrite remote history!" -ForegroundColor Red
Start-Sleep -Seconds 2

git push origin master --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ FORCE PUSH SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 ALL DONE! Changes force-pushed to GitHub" -ForegroundColor Cyan
} else {
    Write-Host "❌ FORCE PUSH FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual intervention required. Try:" -ForegroundColor Yellow
    Write-Host "  git status" -ForegroundColor White
    Write-Host "  git log --oneline -5" -ForegroundColor White
    exit 1
}

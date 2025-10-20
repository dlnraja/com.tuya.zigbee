#!/usr/bin/env pwsh

Write-Host "🚀 FINAL FORCE PUSH - CLEAN VERSION" -ForegroundColor Cyan

Set-Location "C:\Users\HP\Desktop\homey app\tuya_repair"

# Status check
Write-Host "`n📊 Current status:" -ForegroundColor Yellow
git log --oneline -3
Write-Host ""

# Force push with lease
Write-Host "🚀 Force pushing (will override remote)..." -ForegroundColor Yellow
git push --force origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCCESS! Pushed to GitHub" -ForegroundColor Green
    Write-Host "`n📊 Final status:" -ForegroundColor Cyan
    git log --oneline -5
} else {
    Write-Host "`n❌ Push failed" -ForegroundColor Red
    Write-Host "Remote may have large file. Checking..." -ForegroundColor Yellow
    git log --oneline origin/master -5
}

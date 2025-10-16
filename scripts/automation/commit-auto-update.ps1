# Commit automatique du systeme de mise a jour
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit Systeme Auto-Update ===" -ForegroundColor Cyan

# Add all changes
& git add -A

# Commit
& git commit -m "Feature: Systeme complet mise a jour automatique (README + liens + CHANGELOG + GitHub Actions)"

# Push
& git push origin master

Write-Host ""
Write-Host "Systeme auto-update commite et pushe!" -ForegroundColor Green
Write-Host "GitHub Actions va tester le systeme!" -ForegroundColor Yellow

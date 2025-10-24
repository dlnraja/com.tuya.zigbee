# Commit Improvement Roadmap
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit Improvement Roadmap ===" -ForegroundColor Cyan

# Mise a jour automatique
Write-Host "Mise a jour automatique des docs..." -ForegroundColor Yellow
& node scripts/automation/update-all-links.js

# Add all changes
& git add -A

# Commit
& git commit -m "Docs: Roadmap ameliorations (Device Capabilities + Philips Hue + Aqara + SONOFF best practices)"

# Push
& git push origin master

Write-Host ""
Write-Host "Roadmap committee et pushee!" -ForegroundColor Green
Write-Host "Plan complet pour 4 sprints: Flow cards, Virtual capabilities, Manufacturer DB, Settings!" -ForegroundColor Yellow

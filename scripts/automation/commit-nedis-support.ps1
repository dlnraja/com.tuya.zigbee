# Commit Nedis Zigbee Support documentation
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit Nedis Zigbee Support ===" -ForegroundColor Cyan

# Mise a jour automatique
Write-Host "Mise a jour automatique des docs..." -ForegroundColor Yellow
& node scripts/automation/update-all-links.js

# Add all changes
& git add -A

# Commit
& git commit -m "Docs: Integration Nedis Zigbee Support (Tuya inside, pas besoin app separee, Action NL/BE)"

# Push
& git push origin master

Write-Host ""
Write-Host "Documentation Nedis integree et pushee!" -ForegroundColor Green
Write-Host "README auto-genere avec Nedis support!" -ForegroundColor Yellow

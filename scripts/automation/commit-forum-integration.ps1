# Commit integration documentation forum Tuya Zigbee
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit Forum Integration: Tuya Zigbee Local Support ===" -ForegroundColor Cyan

# Mise a jour automatique
Write-Host "Mise a jour automatique des docs..." -ForegroundColor Yellow
& node scripts/automation/update-all-links.js

# Add all changes
& git add -A

# Commit
& git commit -m "Docs: Integration forum - Support Tuya Zigbee Local + Smart Plugs FAQ (sans cloud, 100% local)"

# Push
& git push origin master

Write-Host ""
Write-Host "Documentation forum integree et pushee!" -ForegroundColor Green
Write-Host "GitHub Actions va mettre a jour le README automatiquement!" -ForegroundColor Yellow

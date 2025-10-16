Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit analyse apps communautaires ===" -ForegroundColor Cyan

# Ajouter les fichiers
& git add COMMUNITY_APPS_ANALYSIS.md QUICK_IMPROVEMENTS.md

# Commit
& git commit -m "Docs: Analyse complete apps communautaires Homey (Philips Hue, Aqara, SONOFF) + plan ameliorations flow cards"

# Push
& git push origin master

Write-Host ""
Write-Host "Analyse commitee et pushee!" -ForegroundColor Green

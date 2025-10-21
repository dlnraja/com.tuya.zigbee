Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Correction de l'adresse email Git ===" -ForegroundColor Cyan

# Config local (ce repo)
& git config user.email "dylan.rajasekaram@gmail.com"
& git config user.name "Dylan Rajasekaram"

Write-Host "✅ Config local mise à jour" -ForegroundColor Green

# Config global (tous les repos)
& git config --global user.email "dylan.rajasekaram@gmail.com"
& git config --global user.name "Dylan Rajasekaram"

Write-Host "✅ Config global mise à jour" -ForegroundColor Green

# Afficher la config actuelle
Write-Host "`n=== Configuration Git actuelle ===" -ForegroundColor Cyan
Write-Host "Local:"
& git config user.email
& git config user.name

Write-Host "`nGlobal:"
& git config --global user.email
& git config --global user.name

Write-Host "`n✅ Adresse email corrigée partout!" -ForegroundColor Green
Write-Host "Tous les futurs commits utiliseront: dylan.rajasekaram@gmail.com" -ForegroundColor Yellow

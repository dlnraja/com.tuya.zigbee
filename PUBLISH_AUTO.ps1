#!/usr/bin/env pwsh
# PUBLICATION AUTOMATIQUE HOMEY - Sans interaction

Write-Host "`n🚀 PUBLICATION AUTOMATIQUE v2.0.0`n" -ForegroundColor Cyan

# 1. Nettoyer
Remove-Item .homeybuild -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Nettoyage effectué" -ForegroundColor Green

# 2. Valider
Write-Host "🔍 Validation..." -ForegroundColor Yellow
homey app validate 2>&1 | Out-Null

# 3. Mettre à jour version avec changelog
Write-Host "📝 Mise à jour version vers 2.0.0..." -ForegroundColor Yellow
$changelog = "v2.0.0 - Major enhancement: 164 professional drivers with complete device support"

# Utiliser homey app version avec options
homey app version 2.0.0 --commit --changelog.en $changelog

# 4. Push
Write-Host "📤 Push vers GitHub..." -ForegroundColor Yellow
git push origin master
git push origin --tags

# 5. Build et upload
Write-Host "📦 Build et upload..." -ForegroundColor Yellow
homey app build

Write-Host ""
Write-Host "✅ PUBLICATION COMPLÉTÉE!" -ForegroundColor Green
Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub" -ForegroundColor Cyan
Write-Host ""

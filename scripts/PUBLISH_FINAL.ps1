# PUBLICATION FINALE - Fix homey-zigbeedriver + Flow cards
# Cette version corrige les erreurs signalées par les utilisateurs

Write-Host "🚀 PUBLICATION FINALE - Fix Critical + Flow Cards" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

$rootPath = Get-Location

# Nettoyage cache
Write-Host "🧹 Nettoyage cache Homey..." -ForegroundColor Yellow
Remove-Item -Path ".homeybuild", ".homeycompose" -Recurse -Force -ErrorAction SilentlyContinue

# Validation finale
Write-Host "🔍 Validation finale..." -ForegroundColor Yellow
$validation = homey app validate --level=publish 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Validation réussie" -ForegroundColor Green
} else {
    Write-Host "  ❌ Validation échouée" -ForegroundColor Red
    Write-Host $validation
    exit 1
}

Write-Host ""
Write-Host "📦 CHANGEMENTS DANS CETTE VERSION:" -ForegroundColor Cyan
Write-Host "  ✅ Fix: homey-zigbeedriver dependency ajoutée" -ForegroundColor Green
Write-Host "  ✅ 28 flow cards ajoutées (9 triggers, 7 conditions, 12 actions)" -ForegroundColor Green
Write-Host "  ✅ Support multilingue (EN/FR)" -ForegroundColor Green  
Write-Host "  ✅ Analyse complète de 163 drivers" -ForegroundColor Green
Write-Host "  ✅ Résout le problème des points d'exclamation (!)" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  IMPORTANT: Publication manuelle requise" -ForegroundColor Yellow
Write-Host ""
Write-Host "Exécutez maintenant:" -ForegroundColor White
Write-Host "  homey app publish" -ForegroundColor Cyan
Write-Host ""
Write-Host "Répondez aux prompts:" -ForegroundColor White
Write-Host "  1. Uncommitted changes? → y" -ForegroundColor Gray
Write-Host "  2. Update version? → y" -ForegroundColor Gray
Write-Host "  3. Version type? → [Enter] (patch)" -ForegroundColor Gray
Write-Host "  4. Changelog? → Fix: homey-zigbeedriver dependency + 28 flow cards" -ForegroundColor Gray
Write-Host "  5. Commit? → y" -ForegroundColor Gray
Write-Host "  6. Push? → y" -ForegroundColor Gray
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "✅ Prêt pour publication!" -ForegroundColor Green
Write-Host ""

# Ouvrir le dashboard Homey
Write-Host "📊 Ouvrir le dashboard Homey?" -ForegroundColor Yellow
$response = Read-Host "  (y/n)"
if ($response -eq "y") {
    Start-Process "https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee"
}

# PUBLISH v1.3.2 - Images et README corrigés

Write-Host ""
Write-Host "🚀 PUBLICATION v1.3.2" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Changements v1.3.2:" -ForegroundColor Green
Write-Host "   - Images app store restaurées" -ForegroundColor White
Write-Host "   - README.md user-friendly complet" -ForegroundColor White
Write-Host "   - Commit f6bfb3362 poussé" -ForegroundColor White
Write-Host ""

Write-Host "📝 INSTRUCTIONS IMPORTANTES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Homey CLI va demander:" -ForegroundColor White
Write-Host ""
Write-Host "1. Version already updated? → Appuyez sur Enter" -ForegroundColor Cyan
Write-Host "2. Commit? → Tapez: n (déjà fait)" -ForegroundColor Cyan  
Write-Host "3. Continue without committing? → Tapez: y" -ForegroundColor Cyan
Write-Host ""

Write-Host "Appuyez sur Enter pour publier v1.3.2..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "🚀 Publication en cours..." -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Publication
homey app publish

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host "✅ PUBLICATION v1.3.2 RÉUSSIE !" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Changements appliqués:" -ForegroundColor Cyan
    Write-Host "   ✅ Images app store restaurées" -ForegroundColor Green
    Write-Host "   ✅ README.md complet et user-friendly" -ForegroundColor Green
    Write-Host "   ✅ Version 1.3.2 publiée" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Vérifier:" -ForegroundColor Cyan
    Write-Host "   https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host "❌ ERREUR PUBLICATION" -ForegroundColor Red
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host ""
    Write-Host "Code: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host ""
}

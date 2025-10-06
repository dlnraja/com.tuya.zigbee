# PUBLISH DIRECT - Publication directe sans commit (déjà fait)
# Version 1.3.1 déjà commitée et poussée

Write-Host ""
Write-Host "🚀 PUBLICATION HOMEY v1.3.1" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Version: 1.3.1" -ForegroundColor Green
Write-Host "✅ Commit: c0dda2962" -ForegroundColor Green
Write-Host "✅ Push: Complété" -ForegroundColor Green
Write-Host ""

Write-Host "📝 INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Homey CLI va vous poser des questions:" -ForegroundColor White
Write-Host ""
Write-Host "1. 'Do you want to commit?' → Tapez: n (déjà fait)" -ForegroundColor Cyan
Write-Host "2. Autres questions → Répondez normalement" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Enter pour lancer homey app publish..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "🚀 Lancement publication..." -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Lancer homey app publish
homey app publish

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host "✅ PUBLICATION RÉUSSIE !" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host "❌ ERREUR" -ForegroundColor Red
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Code sortie: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host ""
}

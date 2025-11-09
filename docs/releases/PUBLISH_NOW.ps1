# URGENT PUBLICATION - v4.9.274 CRITICAL FIX
# Fix pour le crash "Cannot find module './TuyaManufacturerCluster'"

Write-Host "========================================" -ForegroundColor Red
Write-Host "  PUBLICATION URGENTE - CRITICAL FIX" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Version: v4.9.274" -ForegroundColor Yellow
Write-Host "Fix: TuyaManufacturerCluster import path" -ForegroundColor Yellow
Write-Host ""

# Navigate to app directory
Set-Location "C:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "1. Validation..." -ForegroundColor Cyan
homey app validate --level publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Validation échouée!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Build..." -ForegroundColor Cyan
homey app build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Build échoué!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PRÊT À PUBLIER!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Exécutez maintenant:" -ForegroundColor Yellow
Write-Host "  homey app publish" -ForegroundColor White
Write-Host ""
Write-Host "Puis confirmez:" -ForegroundColor Yellow
Write-Host "  - Changelog: CRITICAL FIX - Correct TuyaManufacturerCluster import path" -ForegroundColor White
Write-Host "  - Publish? Y" -ForegroundColor White
Write-Host ""

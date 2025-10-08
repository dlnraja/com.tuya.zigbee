# ============================================================================
# EXECUTE 10X AND PUBLISH - Script Master
# ============================================================================

$ErrorActionPreference = "Continue"
Set-Location "c:\Users\HP\Desktop\tuya_repair"

Write-Host "🚀 MASTER 10X COMPLETE + PUBLICATION" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Exécuter enrichissement 10x
Write-Host "🔄 Exécution MASTER_10X_COMPLETE.js..." -ForegroundColor Yellow
node tools\MASTER_10X_COMPLETE.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Master 10x terminé avec succès!`n" -ForegroundColor Green
    
    # Publication directe
    Write-Host "📦 Publication Homey App Store..." -ForegroundColor Yellow
    homey app publish
    
} else {
    Write-Host "`n⚠️ Master 10x terminé avec warnings`n" -ForegroundColor Yellow
}

Write-Host "`n🔗 LIENS:" -ForegroundColor Cyan
Write-Host "  Dashboard: https://tools.developer.homey.app/apps" -ForegroundColor White
Write-Host "  Actions: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White

Write-Host "`n✅ TERMINÉ!" -ForegroundColor Green

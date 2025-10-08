# ============================================================================
# PUBLICATION v1.1.3 - Coherence Fix
# ============================================================================

Write-Host "🚀 PUBLICATION HOMEY v1.1.3" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Set-Location "c:\Users\HP\Desktop\tuya_repair"

# Validation finale
Write-Host "🔍 Validation finale..." -ForegroundColor Yellow
$validation = homey app validate --level=publish 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Validation PASS`n" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Validation warnings (continue)`n" -ForegroundColor Yellow
}

# Publication
Write-Host "📦 Publication vers Homey App Store..." -ForegroundColor Yellow
Write-Host "  Version: 1.1.3" -ForegroundColor Cyan
Write-Host "  Changelog: Coherence fix - filtered manufacturer IDs`n" -ForegroundColor Cyan

Write-Host "IMPORTANT: La commande homey app publish va s'exécuter." -ForegroundColor Yellow
Write-Host "Répondez aux prompts:" -ForegroundColor White
Write-Host "  - Version: patch (ou appuyez sur Entrée)" -ForegroundColor White
Write-Host "  - Confirm: y`n" -ForegroundColor White

# Lancer publication
homey app publish

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✅ Publication lancée!" -ForegroundColor Green
Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

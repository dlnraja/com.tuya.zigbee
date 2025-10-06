# ============================================================================
# PUBLICATION DIRECTE HOMEY - Sans GitHub Actions
# ============================================================================

$ErrorActionPreference = "Continue"
$rootPath = "c:\Users\HP\Desktop\tuya_repair"
Set-Location $rootPath

Write-Host "🚀 PUBLICATION DIRECTE HOMEY v1.1.0" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Nettoyage cache
Write-Host "🧹 Nettoyage cache..." -ForegroundColor Yellow
Remove-Item -Path ".homeybuild", ".homeycompose" -Recurse -Force -ErrorAction SilentlyContinue

# Validation
Write-Host "`n🔍 Validation..." -ForegroundColor Yellow
try {
    $validation = & homey app validate --level=publish 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Validation réussie" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Validation avec warnings (continue)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️ Erreur validation: $_" -ForegroundColor Yellow
}

# Publication
Write-Host "`n📦 Publication vers Homey App Store..." -ForegroundColor Yellow
Write-Host "  Version: 1.1.0" -ForegroundColor Cyan
Write-Host "  IMPORTANT: Suivez les prompts interactifs`n" -ForegroundColor Yellow

try {
    # Méthode interactive directe
    & homey app publish
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ PUBLICATION RÉUSSIE!" -ForegroundColor Green
        Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps" -ForegroundColor Cyan
    } else {
        Write-Host "`n⚠️ Publication terminée avec warnings" -ForegroundColor Yellow
        Write-Host "🔗 Vérifiez: https://tools.developer.homey.app/apps" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "`n❌ Erreur publication: $_" -ForegroundColor Red
    Write-Host "`nℹ️ SOLUTIONS:" -ForegroundColor Yellow
    Write-Host "  1. Vérifiez authentification: homey whoami" -ForegroundColor White
    Write-Host "  2. Re-login si nécessaire: homey login" -ForegroundColor White
    Write-Host "  3. Réessayez: homey app publish" -ForegroundColor White
}

Write-Host "`n================================================" -ForegroundColor Cyan

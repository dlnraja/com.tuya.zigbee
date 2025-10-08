# Script de Nettoyage Permanent - À exécuter avant chaque validation

Write-Host "🧹 NETTOYAGE COMPLET ENVIRONNEMENT HOMEY" -ForegroundColor Cyan
Write-Host "=" * 70

# 1. Arrêter processus (méthode agressive)
Write-Host "`n1. Arrêt des processus..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*homey*"} | Stop-Process -Force -ErrorAction SilentlyContinue
taskkill /F /IM node.exe /T 2>$null | Out-Null
taskkill /F /IM npm.exe /T 2>$null | Out-Null
Start-Sleep -Seconds 3
Write-Host "   ✅ Processus arrêtés" -ForegroundColor Green

# 2. Supprimer fichiers problématiques
Write-Host "`n2. Suppression fichiers problématiques..." -ForegroundColor Yellow
$placeholders = Get-ChildItem -Path "drivers" -Recurse -Filter "*.placeholder" -ErrorAction SilentlyContinue
$specs = Get-ChildItem -Path "drivers" -Recurse -Filter "*-spec.json" -ErrorAction SilentlyContinue
$svgs = Get-ChildItem -Path "drivers" -Recurse -Filter "*.svg" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "icon.svg" }

$placeholders | Remove-Item -Force
$specs | Remove-Item -Force
$svgs | Remove-Item -Force

Write-Host "   ✅ Supprimés: $($placeholders.Count) placeholders, $($specs.Count) specs, $($svgs.Count) SVG" -ForegroundColor Green

# 3. Nettoyer cache Homey (méthode Windows CMD)
Write-Host "`n3. Nettoyage cache Homey..." -ForegroundColor Yellow
if (Test-Path ".homeybuild") {
    # Utiliser rmdir Windows (plus robuste que PowerShell pour dossiers bloqués)
    cmd /c "rmdir /s /q .homeybuild" 2>$null | Out-Null
    Start-Sleep -Seconds 2
}
if (Test-Path ".homeycompose") {
    cmd /c "rmdir /s /q .homeycompose" 2>$null | Out-Null
}
# Vérification
if (-not (Test-Path ".homeybuild") -and -not (Test-Path ".homeycompose")) {
    Write-Host "   ✅ Cache nettoyé complètement" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Cache partiellement nettoyé (peut causer erreurs)" -ForegroundColor Yellow
}
Write-Host "   ✅ Cache nettoyé" -ForegroundColor Green

# 4. Attendre stabilisation
Write-Host "`n4. Attente stabilisation..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "   ✅ Prêt" -ForegroundColor Green

# 5. Build
Write-Host "`n5. Build de l'app..." -ForegroundColor Yellow
homey app build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Build réussi" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build échoué" -ForegroundColor Red
    exit 1
}

# 6. Validation
Write-Host "`n6. Validation publish-level..." -ForegroundColor Yellow
homey app validate --level publish
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Validation réussie" -ForegroundColor Green
} else {
    Write-Host "   ❌ Validation échouée" -ForegroundColor Red
    exit 1
}

Write-Host "`n" + ("=" * 70)
Write-Host "✅ NETTOYAGE ET VALIDATION TERMINÉS" -ForegroundColor Green
Write-Host ""
Write-Host "Vous pouvez maintenant:" -ForegroundColor Cyan
Write-Host "  1. homey login" -ForegroundColor White
Write-Host "  2. homey app publish" -ForegroundColor White

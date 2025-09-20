# CYCLE 6/10: PUBLICATION BUFFER-SAFE v2.0.0
Write-Host "🚀 CYCLE 6/10: PUBLICATION BUFFER-SAFE" -ForegroundColor Green

# Nettoyage pré-publication
if (Test-Path ".homeycompose") {
    Remove-Item ".homeycompose" -Recurse -Force -ErrorAction SilentlyContinue
}

if (Test-Path ".homeybuild") {
    Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue  
}

Write-Host "✅ Nettoyage effectué" -ForegroundColor Yellow

# Publication avec redirection buffer-safe
Write-Host "📡 Lancement publication v2.0.0..." -ForegroundColor Cyan

try {
    # Méthode buffer-safe avec redirection fichier
    cmd /c "homey app publish > project-data\publish-v2-output.log 2>&1"
    Write-Host "✅ Publication terminée - voir project-data\publish-v2-output.log" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur publication: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "✅ CYCLE 6/10 TERMINÉ" -ForegroundColor Green

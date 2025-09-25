# PUBLICATION HOMEY IMMÉDIATE - Buffer Safe
Write-Host "🚀 PUBLICATION HOMEY EN COURS..." -ForegroundColor Green

# Nettoyage préalable
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Cache nettoyé" -ForegroundColor Yellow

# Publication via cmd pour éviter les problèmes de buffer
$publishCmd = 'echo Y | homey app publish --force'
Write-Host "📤 Lancement publication..." -ForegroundColor Cyan

try {
    # Méthode 1: Direct avec cmd
    cmd /c "$publishCmd" 2>&1 | Out-File "project-data\publish-log.txt" -Append
    Write-Host "✅ Publication lancée via CMD" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host "🎉 Publication terminée - Vérifiez le dashboard Homey" -ForegroundColor Green

# FORCE PUBLISH - Publication Automatique Forcée
# Ce script répond automatiquement aux prompts de homey app publish

Write-Host "🚀 FORCE PUBLISH - Publication Automatique" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

$rootPath = Get-Location
Write-Host "📂 Working directory: $rootPath" -ForegroundColor Yellow
Write-Host ""

# Vérifier que Homey CLI est installé
try {
    $homeyVersion = homey --version 2>&1
    Write-Host "✅ Homey CLI détecté: $homeyVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Homey CLI non trouvé. Installez-le avec: npm install -g homey" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🤖 Lancement publication avec réponses automatiques..." -ForegroundColor Yellow
Write-Host ""

# Préparer les réponses automatiques
$responses = @(
    "y",      # Uncommitted changes? Yes
    "y",      # Update version? Yes
    "",       # Version type? [Enter] for patch
    "Fix: Settings infinite loop + homey-zigbeedriver dependency + 28 flow cards",
    "y",      # Commit? Yes
    "y"       # Push? Yes
)

# Créer un fichier temporaire avec les réponses
$tempFile = [System.IO.Path]::GetTempFileName()
$responses | Out-File -FilePath $tempFile -Encoding ASCII

Write-Host "📝 Réponses automatiques configurées:" -ForegroundColor Cyan
for ($i = 0; $i -lt $responses.Length; $i++) {
    $response = if ($responses[$i] -eq "") { "[Enter]" } else { $responses[$i] }
    Write-Host "   $($i+1). $response" -ForegroundColor Gray
}
Write-Host ""

try {
    # Lancer homey app publish avec les réponses automatiques
    Get-Content $tempFile | homey app publish
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=" * 80 -ForegroundColor Green
        Write-Host "✅ PUBLICATION RÉUSSIE !" -ForegroundColor Green
        Write-Host "=" * 80 -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 Vérifier sur: https://tools.developer.homey.app/apps" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "=" * 80 -ForegroundColor Yellow
        Write-Host "⚠️  PUBLICATION NÉCESSITE INTERVENTION MANUELLE" -ForegroundColor Yellow
        Write-Host "=" * 80 -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Exécutez manuellement: homey app publish" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors de la publication:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Nettoyer le fichier temporaire
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "📊 Pour vérifier le status:" -ForegroundColor Yellow
Write-Host "   - Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor Gray
Write-Host "   - GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Gray
Write-Host ""

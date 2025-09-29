# ULTIMATE ZIGBEE HUB v2.1.0 - RÉSOLUTION MAXBUFFER + FORCE PUBLISH
# ITÉRATION 1/10 - Fix stdout maxBuffer exceeded + publication automatisée

Write-Host "🚀 DÉMARRAGE PUBLICATION ULTIMATE ZIGBEE HUB v2.1.0" -ForegroundColor Green

# Nettoyer .homeybuild
if (Test-Path ".homeybuild") {
    Remove-Item ".homeybuild" -Recurse -Force
    Write-Host "✅ .homeybuild nettoyé" -ForegroundColor Yellow
}

# Créer log directory
New-Item -ItemType Directory -Force -Path "project-data\publish-logs" | Out-Null

# Mise à jour .homeycompose vers app.json
Write-Host "📝 Compilation .homeycompose..." -ForegroundColor Cyan
& homey app build 2>&1 | Out-File "project-data\publish-logs\build-log.txt"

# Publication avec redirection complète pour éviter maxBuffer
Write-Host "📤 PUBLICATION AVEC REDIRECTION MAXBUFFER..." -ForegroundColor Magenta

$publishProcess = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -NoNewWindow -PassThru -RedirectStandardOutput "project-data\publish-logs\publish-output.log" -RedirectStandardError "project-data\publish-logs\publish-errors.log"

# Attendre que le process se termine
$publishProcess.WaitForExit()

Write-Host "✅ PUBLICATION TERMINÉE - Logs disponibles dans project-data\publish-logs\" -ForegroundColor Green

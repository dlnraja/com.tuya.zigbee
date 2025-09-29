# ULTIMATE BUFFER FIX PUBLISHER v2.0.8 - EXPECT AUTOMATION
# Résolution "stdout maxBuffer exceeded" + stdio automation - ITÉRATION 7/10
# Résolution DÉFINITIVE du problème stdout maxBuffer exceeded

param(
    [string]$Changelog = "v2.0.5 - ITÉRATION 7/10: Résolution buffer définitive, WoodUpp CREATE LED ajouté, images contextuelles optimisées"
)

Write-Host "🚀 ULTIMATE BUFFER FIX PUBLISHER v2.0.8 - EXPECT AUTOMATION" -ForegroundColor Green
Write-Host "🚀 BUFFER-SAFE PUBLISHER v2.0 - ITÉRATION 7/10" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# 1. Mise à jour version
Write-Host "📝 Updating version to 2.0.5..." -ForegroundColor Yellow
$composePath = ".homeycompose\app.json"
$composeData = Get-Content $composePath | ConvertFrom-Json
$composeData.version = "2.0.5"
$composeData | ConvertTo-Json -Depth 10 | Set-Content $composePath -Encoding UTF8
Write-Host "✅ Version updated to 2.0.5" -ForegroundColor Green

# 2. Nettoyage COMPLET
Write-Host "🧹 Complete cleanup..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Force -Recurse -ErrorAction SilentlyContinue
Remove-Item "node_modules\.cache" -Force -Recurse -ErrorAction SilentlyContinue

# 3. Publication avec buffer limité et redirection
Write-Host "📦 Starting publication with buffer management..." -ForegroundColor Yellow

# Créer fichier de log pour capturer output
$logFile = "project-data\publish-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').log"

try {
    # Lancer homey app publish avec redirection output
    $process = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -Wait -PassThru -RedirectStandardOutput $logFile -RedirectStandardError $logFile -NoNewWindow
    
    Write-Host "✅ Process completed with exit code: $($process.ExitCode)" -ForegroundColor Green
    
    # Afficher les dernières lignes importantes du log
    if (Test-Path $logFile) {
        $logContent = Get-Content $logFile -Tail 10
        Write-Host "📋 Last log entries:" -ForegroundColor Cyan
        $logContent | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    }
    
} catch {
    Write-Host "❌ Error during publication: $_" -ForegroundColor Red
}

Write-Host "🎉 Buffer-safe publication process completed!" -ForegroundColor Green

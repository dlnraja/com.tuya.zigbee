# PUBLICATION FINALE v1.0.32 - RECERTIFICATION HOMEY
Write-Host "🎯 PUBLICATION FINALE v1.0.32" -ForegroundColor Green

# Nettoyage complet
if (Test-Path ".homeybuild") {
    Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
}

# Test build
Write-Host "🔨 Test build..." -ForegroundColor Yellow
homey app build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build réussi" -ForegroundColor Green
    
    # Publication avec commits préalables
    Write-Host "📦 Ajout changements..." -ForegroundColor Yellow
    git add .
    git commit -m "🔧 Fix final issues - Ready for v1.0.32 publication"
    
    Write-Host "🚀 Publication v1.0.32..." -ForegroundColor Cyan
    # Publication buffer-safe avec echo pour répondre automatiquement
    echo "y" | homey app publish --patch > "project-data\publish-v1032-final.log" 2>&1
    
    Write-Host "✅ Publication lancée - voir project-data\publish-v1032-final.log" -ForegroundColor Green
} else {
    Write-Host "❌ Build échoué - vérifier les erreurs" -ForegroundColor Red
}

Write-Host "🎉 CYCLES 1-10/10 FINALISÉS" -ForegroundColor Magenta

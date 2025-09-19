# CYCLE 9/10: CORRECTION NPM + REBUILD
Write-Host "🔧 CYCLE 9/10: NPM FIX + REBUILD" -ForegroundColor Green

# Fix npm issues
Write-Host "🔧 Correction npm..." -ForegroundColor Yellow
npm install --force

# Clean build
Write-Host "🧹 Clean rebuild..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "app.json" -Force -ErrorAction SilentlyContinue

# Rebuild from clean .homeycompose
Write-Host "🔨 Rebuild app..." -ForegroundColor Yellow
homey app build

Write-Host "✅ CYCLE 9/10 TERMINÉ" -ForegroundColor Green

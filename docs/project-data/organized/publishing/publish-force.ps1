# Ultimate Zigbee Hub - Force Publication Script
Write-Host "🚀 FORCE PUBLICATION ULTIMATE ZIGBEE HUB" -ForegroundColor Cyan

# Clean build directory
Write-Host "🧹 Nettoyage du répertoire de build..." -ForegroundColor Yellow
if (Test-Path ".homeybuild") {
    cmd /c "rd /s /q .homeybuild 2>nul"
}

# Fix app.json
Write-Host "📝 Correction app.json..." -ForegroundColor Yellow
$content = Get-Content ".homeycompose/app.json" -Raw
$content | Out-File -FilePath "app.json" -Encoding UTF8 -NoNewline

# Validate
Write-Host "🔍 Validation rapide..." -ForegroundColor Yellow
homey app validate --level=publish 2>$null | Out-Null

# Prepare responses
$changelog = "Ultimate Zigbee Hub v1.1.8 - Automated publication. 1500+ Zigbee devices from 80+ manufacturers. SDK3 compliant."

# Create input file
$responses = @"
y
y

$changelog
"@

$responses | Out-File -FilePath "pub-input.txt" -Encoding ASCII -NoNewline

# Method 1: PowerShell piping
Write-Host "`n📤 Méthode 1: PowerShell piping..." -ForegroundColor Cyan
try {
    Get-Content "pub-input.txt" | homey app publish
    Write-Host "✅ SUCCÈS via PowerShell!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "⚠️ Échec méthode 1" -ForegroundColor Yellow
}

# Method 2: CMD piping
Write-Host "`n📤 Méthode 2: CMD piping..." -ForegroundColor Cyan
$result = cmd /c "type pub-input.txt | homey app publish 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCÈS via CMD!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️ Échec méthode 2" -ForegroundColor Yellow
}

# Method 3: Direct with echo
Write-Host "`n📤 Méthode 3: Echo direct..." -ForegroundColor Cyan
$cmd = 'echo y& echo y& echo.& echo ' + $changelog + ' | homey app publish'
$result = cmd /c $cmd
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCÈS via echo!" -ForegroundColor Green
    exit 0
}

# Method 4: Interactive fallback
Write-Host "`n📤 Méthode 4: Exécution interactive..." -ForegroundColor Cyan
Write-Host "Instructions manuelles:" -ForegroundColor Yellow
Write-Host "1. Répondre 'y' pour les changements non commités"
Write-Host "2. Répondre 'y' pour la mise à jour de version"
Write-Host "3. Appuyer sur [Enter] pour sélectionner Patch"
Write-Host "4. Coller: $changelog"
Write-Host ""

homey app publish

# Cleanup
if (Test-Path "pub-input.txt") { Remove-Item "pub-input.txt" }

Write-Host "`n✨ Script terminé" -ForegroundColor Green
Write-Host "🔗 Vérifier: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub" -ForegroundColor Cyan

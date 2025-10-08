# PUBLISH NOW - Publication Immédiate et Fiable
# Script PowerShell robuste pour publication Homey

param(
    [string]$VersionType = "patch",
    [string]$Changelog = "Fix: Settings infinite loop + homey-zigbeedriver dependency + 28 flow cards"
)

Write-Host ""
Write-Host "🚀 HOMEY APP PUBLICATION" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Vérifier Homey CLI
Write-Host "🔍 Vérification Homey CLI..." -ForegroundColor Yellow
try {
    $version = homey --version 2>&1
    Write-Host "  ✅ Homey CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Homey CLI non trouvé!" -ForegroundColor Red
    Write-Host "  📦 Installation: npm install -g homey" -ForegroundColor Yellow
    exit 1
}

# Nettoyage
Write-Host ""
Write-Host "🧹 Nettoyage cache..." -ForegroundColor Yellow
Remove-Item -Path ".homeybuild", ".homeycompose" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  ✅ Cache nettoyé" -ForegroundColor Green

# Build
Write-Host ""
Write-Host "🔨 Build de l'app..." -ForegroundColor Yellow
$buildResult = homey app build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Build réussi" -ForegroundColor Green
} else {
    Write-Host "  ❌ Build échoué" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}

# Validation
Write-Host ""
Write-Host "✅ Validation (niveau publish)..." -ForegroundColor Yellow
$validateResult = homey app validate --level=publish 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Validation réussie" -ForegroundColor Green
} else {
    Write-Host "  ❌ Validation échouée" -ForegroundColor Red
    Write-Host $validateResult
    exit 1
}

# Version actuelle
Write-Host ""
Write-Host "📊 Version actuelle..." -ForegroundColor Yellow
$appJson = Get-Content "app.json" | ConvertFrom-Json
Write-Host "  📌 Version: $($appJson.version)" -ForegroundColor Cyan

# Confirmation
Write-Host ""
Write-Host "📝 Paramètres de publication:" -ForegroundColor Cyan
Write-Host "  Version type: $VersionType" -ForegroundColor Gray
Write-Host "  Changelog: $Changelog" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Cette opération va:" -ForegroundColor Yellow
Write-Host "  1. Incrémenter la version ($VersionType)" -ForegroundColor Gray
Write-Host "  2. Créer un commit" -ForegroundColor Gray
Write-Host "  3. Pousser vers GitHub" -ForegroundColor Gray
Write-Host "  4. Publier sur Homey App Store" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Continuer? (o/N)"
if ($confirm -ne "o" -and $confirm -ne "O" -and $confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host ""
    Write-Host "❌ Publication annulée" -ForegroundColor Yellow
    exit 0
}

# Publication
Write-Host ""
Write-Host "🚀 Lancement de la publication..." -ForegroundColor Cyan
Write-Host ""
Write-Host "ℹ️  Répondez aux prompts de Homey CLI:" -ForegroundColor Yellow
Write-Host "  1. Uncommitted changes? → y" -ForegroundColor Gray
Write-Host "  2. Update version? → y" -ForegroundColor Gray
Write-Host "  3. Version type? → [Enter] ou tapez: $VersionType" -ForegroundColor Gray
Write-Host "  4. Changelog? → Tapez votre changelog ou [Enter]" -ForegroundColor Gray
Write-Host "  5. Commit? → y" -ForegroundColor Gray
Write-Host "  6. Push? → y" -ForegroundColor Gray
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Lancer homey app publish (interactif)
homey app publish

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host "✅ PUBLICATION RÉUSSIE !" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Dashboard Homey:" -ForegroundColor Cyan
    Write-Host "   https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 GitHub Repository:" -ForegroundColor Cyan
    Write-Host "   https://github.com/dlnraja/com.tuya.zigbee" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host "❌ PUBLICATION ÉCHOUÉE" -ForegroundColor Red
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Vérifiez:" -ForegroundColor Yellow
    Write-Host "  - Connexion internet" -ForegroundColor Gray
    Write-Host "  - Authentication Homey CLI (homey login)" -ForegroundColor Gray
    Write-Host "  - Logs ci-dessus pour détails" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

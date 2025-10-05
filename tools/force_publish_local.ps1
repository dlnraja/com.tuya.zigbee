# Force Publication Locale Homey
# Automatise au maximum le processus de login et publish

Write-Host "🚀 FORCE PUBLICATION LOCALE HOMEY" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host ""

# Étape 1: Validation pré-publication
Write-Host "📋 Étape 1/6: Préparation et validation..." -ForegroundColor Yellow

Write-Host "  → Nettoyage fichiers inutiles..." -ForegroundColor Gray
Get-ChildItem -Path "drivers" -Recurse -Filter "*.placeholder" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "drivers" -Recurse -Filter "*-spec.json" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "drivers" -Recurse -Filter "*.svg" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "icon.svg" } | Remove-Item -Force

Write-Host "  → Nettoyage fichiers inutiles (placeholder, spec, svg)..." -ForegroundColor Gray
Get-ChildItem -Path "drivers" -Recurse -Filter "*.placeholder" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "drivers" -Recurse -Filter "*-spec.json" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "drivers" -Recurse -Filter "*.svg" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "icon.svg" } | Remove-Item -Force

Write-Host "  → Nettoyage cache Homey..." -ForegroundColor Gray
if (Test-Path ".homeybuild") { Remove-Item -Recurse -Force ".homeybuild" }
if (Test-Path ".homeycompose") { Remove-Item -Recurse -Force ".homeycompose" }

Write-Host "  → Build de l'app..." -ForegroundColor Gray
homey app build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build échoué" -ForegroundColor Red
    exit 1
}

Write-Host "  → Validation JSON..." -ForegroundColor Gray
node tools/validate_all_json.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Validation JSON échouée" -ForegroundColor Red
    exit 1
}

Write-Host "  → Validation SDK3 publish-level..." -ForegroundColor Gray
homey app validate --level publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Validation SDK3 échouée" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Validations OK" -ForegroundColor Green
Write-Host ""

# Étape 2: Vérifier installation Homey CLI
Write-Host "📋 Étape 2/6: Vérification Homey CLI..." -ForegroundColor Yellow

$homeyCli = Get-Command homey -ErrorAction SilentlyContinue
if (-not $homeyCli) {
    Write-Host "  → Installation Homey CLI..." -ForegroundColor Gray
    npm install -g homey --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Installation échouée" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Homey CLI prêt" -ForegroundColor Green
Write-Host ""

# Étape 3: Vérifier Git status
Write-Host "📋 Étape 3/6: Vérification Git..." -ForegroundColor Yellow

$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Changements non commités détectés" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $commit = Read-Host "Commit automatique? (y/n)"
    if ($commit -eq 'y') {
        git add -A
        git commit -m "Pre-publish: validation OK"
        git push origin master
        Write-Host "✅ Changements commités et poussés" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Git propre" -ForegroundColor Green
}
Write-Host ""

# Étape 4: Login Homey
Write-Host "📋 Étape 4/6: Login Homey..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 ATTENTION: Vous devez entrer vos credentials Homey" -ForegroundColor Cyan
Write-Host "   Email: Votre email Homey"
Write-Host "   Password: Votre mot de passe"
Write-Host ""
Write-Host "Appuyez sur Entrée pour continuer..." -ForegroundColor Yellow
Read-Host

# Tentative de login
Write-Host "Exécution: homey login" -ForegroundColor Gray
homey login

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Login échoué" -ForegroundColor Red
    Write-Host ""
    Write-Host "Raisons possibles:" -ForegroundColor Yellow
    Write-Host "  1. Credentials incorrects"
    Write-Host "  2. Connexion Internet instable"
    Write-Host "  3. Problème serveur Homey"
    Write-Host ""
    Write-Host "Réessayer? (y/n)" -ForegroundColor Yellow
    $retry = Read-Host
    if ($retry -eq 'y') {
        homey login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Login échoué à nouveau" -ForegroundColor Red
            exit 1
        }
    } else {
        exit 1
    }
}

Write-Host "✅ Login réussi" -ForegroundColor Green
Write-Host ""

# Étape 5: Publication
Write-Host "📋 Étape 5/5: Publication vers Homey App Store..." -ForegroundColor Yellow
Write-Host ""

# Charger app.json pour afficher la version
$appJson = Get-Content "app.json" | ConvertFrom-Json
$currentVersion = $appJson.version

Write-Host "📦 Version à publier: $currentVersion" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Changelog suggéré:" -ForegroundColor Cyan
Write-Host "---" -ForegroundColor Gray
Write-Host "🎯 N6 Protocol Complete" -ForegroundColor Gray
Write-Host "- Historical analysis: 50 commits + 10 forks analyzed" -ForegroundColor Gray
Write-Host "- Intelligent enrichment: +810 manufacturers (1236 total)" -ForegroundColor Gray
Write-Host "- Category-based targeting: 9 device types" -ForegroundColor Gray
Write-Host "- BDU N6 consolidated: All sources integrated" -ForegroundColor Gray
Write-Host "- Validation: 0 errors (JSON + SDK3 + coherence)" -ForegroundColor Gray
Write-Host "- Images: 327 SDK3-compliant assets" -ForegroundColor Gray
Write-Host "- IA image generation: Automation scripts added" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray
Write-Host ""

Write-Host "Continuer la publication? (y/n)" -ForegroundColor Yellow
$confirm = Read-Host

if ($confirm -ne 'y') {
    Write-Host "❌ Publication annulée" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Exécution: homey app publish" -ForegroundColor Gray
Write-Host ""

# Publication
homey app publish

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 70 -ForegroundColor Green
    Write-Host "🎉 PUBLICATION RÉUSSIE!" -ForegroundColor Green
    Write-Host "=" * 70 -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Détails:" -ForegroundColor Cyan
    Write-Host "  Version: $currentVersion" -ForegroundColor Gray
    Write-Host "  App: Ultimate Zigbee Hub" -ForegroundColor Gray
    Write-Host "  Drivers: 162" -ForegroundColor Gray
    Write-Host "  Manufacturers: 1236" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 Liens utiles:" -ForegroundColor Cyan
    Write-Host "  Dashboard: https://tools.developer.homey.app" -ForegroundColor Gray
    Write-Host "  App Store: https://homey.app" -ForegroundColor Gray
    Write-Host "  Forum: https://community.homey.app/t/140352" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Publication échouée" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez les erreurs ci-dessus" -ForegroundColor Yellow
    Write-Host "Pour réessayer: pwsh -File tools/force_publish_local.ps1" -ForegroundColor Yellow
    exit 1
}


---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Script de réorganisation simplifiée du projet
# Mode enrichissement additif

Write-Host "REORGANISATION SIMPLIFIEE DU PROJET - Mode enrichissement" -ForegroundColor Green

# Créer les dossiers principaux
$mainDirs = @(
    "docs/README",
    "docs/CHANGELOG", 
    "docs/CONTRIBUTING",
    "docs/CODE_OF_CONDUCT",
    "docs/docs/LICENSE/LICENSE",
    "docs/INSTALLATION",
    "docs/TROUBLESHOOTING",
    "docs/todo/current",
    "docs/reports/final",
    "docs/reports/analysis",
    "config/git",
    "config/editor",
    "config/lint",
    "config/homey",
    "data/devices",
    "data/analysis"
)

foreach ($dir in $mainDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "SUCCESS: Dossier cree: $dir" -ForegroundColor Green
    }
}

# Déplacer les fichiers README
if (Test-Path "docs/locales/en/README.md") {
    Move-Item "docs/locales/en/README.md" "docs/locales/en/README.md" -Force
    Write-Host "SUCCESS: docs/locales/en/README.md deplace" -ForegroundColor Green
}

if (Test-Path "README.txt") {
    Move-Item "README.txt" "docs/README/README.txt" -Force
    Write-Host "SUCCESS: README.txt deplace" -ForegroundColor Green
}

# Déplacer les fichiers de documentation
if (Test-Path "docs/CONTRIBUTING/CONTRIBUTING.md") {
    Move-Item "docs/CONTRIBUTING/CONTRIBUTING.md" "docs/CONTRIBUTING/docs/CONTRIBUTING/CONTRIBUTING.md" -Force
    Write-Host "SUCCESS: docs/CONTRIBUTING/CONTRIBUTING.md deplace" -ForegroundColor Green
}

if (Test-Path "docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md") {
    Move-Item "docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md" "docs/CODE_OF_CONDUCT/docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md" -Force
    Write-Host "SUCCESS: docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md deplace" -ForegroundColor Green
}

if (Test-Path "docs/LICENSE/LICENSE") {
    Move-Item "docs/LICENSE/LICENSE" "docs/docs/LICENSE/LICENSE/docs/LICENSE/LICENSE" -Force
    Write-Host "SUCCESS: docs/LICENSE/LICENSE deplace" -ForegroundColor Green
}

# Déplacer les fichiers TODO
if (Test-Path "docs/todo/current/TODO_REPRISE_49H.md") {
    Move-Item "docs/todo/current/TODO_REPRISE_49H.md" "docs/todo/current/docs/todo/current/TODO_REPRISE_49H.md" -Force
    Write-Host "SUCCESS: docs/todo/current/TODO_REPRISE_49H.md deplace" -ForegroundColor Green
}

# Déplacer les rapports finaux
$finalReports = @(
    "RAPPORT_FINAL_EXECUTION.md",
    "RAPPORT_FINAL_ZIGBEE_ENRICHMENT.md", 
    "RAPPORT_FINAL_COMPLETION.md",
    "RAPPORT_CORRECTION_GITHUB_PAGES.md",
    "RESUME_FINAL_CURSOR.md"
)

foreach ($report in $finalReports) {
    if (Test-Path $report) {
        Move-Item $report "docs/reports/final/$report" -Force
        Write-Host "SUCCESS: $report deplace" -ForegroundColor Green
    }
}

# Déplacer les fichiers de configuration
if (Test-Path ".eslintrc.json") {
    Move-Item ".eslintrc.json" "config/lint/.eslintrc.json" -Force
    Write-Host "SUCCESS: .eslintrc.json deplace" -ForegroundColor Green
}

if (Test-Path ".eslintrc.js") {
    Move-Item ".eslintrc.js" "config/lint/.eslintrc.js" -Force
    Write-Host "SUCCESS: .eslintrc.js deplace" -ForegroundColor Green
}

if (Test-Path ".editorconfig") {
    Move-Item ".editorconfig" "config/editor/.editorconfig" -Force
    Write-Host "SUCCESS: .editorconfig deplace" -ForegroundColor Green
}

if (Test-Path ".cursorrules") {
    Move-Item ".cursorrules" "config/editor/.cursorrules" -Force
    Write-Host "SUCCESS: .cursorrules deplace" -ForegroundColor Green
}

if (Test-Path ".cursorignore") {
    Move-Item ".cursorignore" "config/editor/.cursorignore" -Force
    Write-Host "SUCCESS: .cursorignore deplace" -ForegroundColor Green
}

if (Test-Path "tsconfig.json") {
    Move-Item "tsconfig.json" "config/lint/tsconfig.json" -Force
    Write-Host "SUCCESS: tsconfig.json deplace" -ForegroundColor Green
}

if (Test-Path ".homeyplugins.json") {
    Move-Item ".homeyplugins.json" "config/homey/.homeyplugins.json" -Force
    Write-Host "SUCCESS: .homeyplugins.json deplace" -ForegroundColor Green
}

if (Test-Path ".homeychangelog.json") {
    Move-Item ".homeychangelog.json" "config/homey/.homeychangelog.json" -Force
    Write-Host "SUCCESS: .homeychangelog.json deplace" -ForegroundColor Green
}

if (Test-Path ".homeyignore") {
    Move-Item ".homeyignore" "config/homey/.homeyignore" -Force
    Write-Host "SUCCESS: .homeyignore deplace" -ForegroundColor Green
}

# Déplacer les fichiers de données
if (Test-Path "all_devices.json") {
    Move-Item "all_devices.json" "data/devices/all_devices.json" -Force
    Write-Host "SUCCESS: all_devices.json deplace" -ForegroundColor Green
}

if (Test-Path "all_commits.txt") {
    Move-Item "all_commits.txt" "data/analysis/all_commits.txt" -Force
    Write-Host "SUCCESS: all_commits.txt deplace" -ForegroundColor Green
}

# Déplacer les rapports existants
if (Test-Path "rapports") {
    $rapportFiles = Get-ChildItem "rapports" -File
    foreach ($file in $rapportFiles) {
        Move-Item $file.FullName "docs/reports/analysis/$($file.Name)" -Force
        Write-Host "SUCCESS: $($file.Name) deplace" -ForegroundColor Green
    }
    
    # Supprimer le dossier rapports vide
    Remove-Item "rapports" -Force -ErrorAction SilentlyContinue
    Write-Host "SUCCESS: Dossier rapports supprime" -ForegroundColor Green
}

# Créer des liens symboliques pour les fichiers essentiels
$essentialFiles = @{
    "docs/README/README.md" = "README.md"
    "docs/CHANGELOG/CHANGELOG.md" = "CHANGELOG.md"
    "docs/CONTRIBUTING/docs/CONTRIBUTING/CONTRIBUTING.md" = "docs/CONTRIBUTING/CONTRIBUTING.md"
    "docs/CODE_OF_CONDUCT/docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md" = "docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md"
    "docs/docs/LICENSE/LICENSE/docs/LICENSE/LICENSE" = "docs/LICENSE/LICENSE"
    "config/git/.gitignore" = ".gitignore"
    "config/homey/.homeyignore" = ".homeyignore"
    "config/lint/tsconfig.json" = "tsconfig.json"
}

foreach ($source in $essentialFiles.Keys) {
    if (Test-Path $source) {
        $link = $essentialFiles[$source]
        if (Test-Path $link) {
            Remove-Item $link -Force
        }
        New-Item -ItemType SymbolicLink -Path $link -Target $source -Force
        Write-Host "SUCCESS: Lien cree: $link" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "REORGANISATION SIMPLIFIEE TERMINEE - Mode additif applique" -ForegroundColor Green
Write-Host "SUCCESS: Structure optimisee" -ForegroundColor Green
Write-Host "SUCCESS: Fichiers reorganises" -ForegroundColor Green
Write-Host "SUCCESS: Liens essentiels crees" -ForegroundColor Green 



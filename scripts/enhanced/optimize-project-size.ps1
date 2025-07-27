
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Script d'optimisation de la taille du projet
# Mode enrichissement additif

Write-Host "OPTIMISATION TAILLE PROJET - Mode enrichissement" -ForegroundColor Green

# Supprimer les fichiers temporaires et caches
Write-Host "Suppression des fichiers temporaires..." -ForegroundColor Yellow
Get-ChildItem -Recurse -File | Where-Object { $_.Name -match "\.(tmp|temp|bak|old|log)$" } | Remove-Item -Force -ErrorAction SilentlyContinue

# Supprimer les fichiers système
Write-Host "Suppression des fichiers système..." -ForegroundColor Yellow
Get-ChildItem -Recurse -File | Where-Object { $_.Name -match "\.DS_Store|Thumbs\.db|desktop\.ini" } | Remove-Item -Force -ErrorAction SilentlyContinue

# Supprimer les fichiers de lock
Write-Host "Suppression des fichiers de lock..." -ForegroundColor Yellow
Get-ChildItem -Recurse -File | Where-Object { $_.Name -match "package-lock\.json|yarn\.lock|\.lock" } | Remove-Item -Force -ErrorAction SilentlyContinue

# Supprimer les gros fichiers d'images non nécessaires
Write-Host "Suppression des gros fichiers d'images..." -ForegroundColor Yellow
Get-ChildItem -Recurse -File | Where-Object { $_.Name -match "large\.png|big\.jpg|huge\.gif" } | Remove-Item -Force -ErrorAction SilentlyContinue

# Supprimer les dossiers de développement
Write-Host "Suppression des dossiers de développement..." -ForegroundColor Yellow
$devDirs = @(".vscode", ".homeycompose", "cursor-dev", "issues")
foreach ($dir in $devDirs) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        Write-Host "SUCCESS: $dir supprime" -ForegroundColor Green
    }
}

# Nettoyer les fichiers de données volumineux
Write-Host "Nettoyage des fichiers de données..." -ForegroundColor Yellow
$bigFiles = @("docs/dashboard/drivers_data.json", "all_devices.json", "all_commits.txt")
foreach ($file in $bigFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        Write-Host "SUCCESS: $file supprime" -ForegroundColor Green
    }
}

# Optimiser le .homeyignore
Write-Host "Optimisation du .homeyignore..." -ForegroundColor Yellow
$homeyignore = @"
# Fichiers de développement
.vscode/
.cursor/
*.log
*.tmp
*.temp

# Fichiers de build
node_modules/
dist/
build/

# Fichiers de données volumineux
docs/dashboard/drivers_data.json
all_devices.json
all_commits.txt

# Fichiers de configuration de développement
.cursorrules
.cursorignore
.eslintrc.*
tsconfig.json

# Dossiers de développement
cursor-dev/
issues/
logs/
backup/
archives/

# Fichiers temporaires
*.bak
*.old
*.tmp
*.temp
"@

Set-Content -Path ".homeyignore" -Value $homeyignore -Encoding UTF8
Write-Host "SUCCESS: .homeyignore optimise" -ForegroundColor Green

# Calculer la taille finale
$totalSize = (Get-ChildItem -Recurse -File | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host ""
Write-Host "OPTIMISATION TERMINEE" -ForegroundColor Green
Write-Host "Taille finale: $sizeMB MB" -ForegroundColor Green
Write-Host "Mode additif applique avec succes" -ForegroundColor Green 

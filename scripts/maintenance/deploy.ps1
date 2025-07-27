# Script de déploiement automatique complet
# Généré le 2025-07-27 17:07:19

Write-Host '🚀 DÉPLOIEMENT AUTOMATIQUE COMPLET' -ForegroundColor Green

# Étape 1: Validation du projet
Write-Host '✅ Validation du projet...' -ForegroundColor Cyan
Test-Path 'package.json'


# Étape 2: Mise à jour du dashboard
& '.\scripts\update-dashboard-auto.ps1'

# Étape 3: Commit et push
git add .
git commit -m '🚀 Déploiement automatique - 2025-07-27 17:09:58'
git push origin master

Write-Host '✅ DÉPLOIEMENT TERMINÉ' -ForegroundColor Green

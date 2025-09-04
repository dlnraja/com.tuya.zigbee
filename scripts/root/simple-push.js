#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:40.747Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script simple pour pousser les modifications vers GitHub

# Configuration
$repoPath = "c:\Users\HP\Desktop\tuya_repair"
$githubUser = "dlnraja"
$githubEmail = "dylan.rajasekaram@gmail.com"
$repoName = "com.tuya.zigbee"
$branch = "master"

# Se déplacer dans le répertoire du projet
Set-Location -Path $repoPath

# Afficher la configuration actuelle
console.log "Configuration actuelle de Git:" -ForegroundColor Cyan
git config --list

# Configurer Git
console.log "`nConfiguration de Git..." -ForegroundColor Cyan
git config --global user.name $githubUser
git config --global user.email $githubEmail

# Afficher l'état actuel
console.log "`nÉtat actuel du dépôt:" -ForegroundColor Cyan
git status

# Ajouter tous les fichiers
console.log "`nAjout de tous les fichiers..." -ForegroundColor Cyan
git add .

# Créer un commit
console.log "`nCréation du commit..." -ForegroundColor Cyan
git commit -m "Mise à jour du projet Tuya Zigbee"

# Vérifier si le dépôt distant est configuré
$remoteUrl = git config --get remote.origin.url
if (-not $remoteUrl) {
    console.log "`nConfiguration du dépôt distant..." -ForegroundColor Cyan
    git remote add origin "https://github.com/$githubUser/$repoName.git"
}

# Pousser les modifications
console.log "`nPousse des modifications vers GitHub..." -ForegroundColor Cyan
console.log "URL du dépôt: https://github.com/$githubUser/$repoName.git" -ForegroundColor Yellow
console.log "Branche: $branch" -ForegroundColor Yellow

try {
    git push -u origin $branch --force
    console.log "`n✓ Modifications poussées avec succès!" -ForegroundColor Green
} catch {
    console.log "`n❌ Erreur lors du push: $_" -ForegroundColor Red
    console.log "Veuillez vérifier votre connexion Internet et vos identifiants GitHub." -ForegroundColor Yellow
}

# Afficher l'URL du dépôt
console.log "`nVotre dépôt est disponible à l'adresse:" -ForegroundColor Cyan
console.log "https://github.com/$githubUser/$repoName" -ForegroundColor Blue -BackgroundColor White

Read-Host "`nAppuyez sur Entrée pour quitter..."

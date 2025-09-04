#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:38.642Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Configuration
$repoPath = "c:\Users\HP\Desktop\tuya_repair"
$githubUser = "dlnraja"
$githubEmail = "dylan.rajasekaram@gmail.com"
$repoName = "com.tuya.zigbee"
$branch = "master"

# Se déplacer dans le répertoire du projet
Set-Location -Path $repoPath

# Configuration de Git
console.log "Configuration de Git..." -ForegroundColor Cyan
try {
    git config --global user.name $githubUser
    git config --global user.email $githubEmail
    console.log "✓ Configuration Git effectuée" -ForegroundColor Green
} catch {
    console.log "Erreur de configuration Git: $_" -ForegroundColor Red
    exit 1
}

# Vérifier si c'est un dépôt Git
if (-not (fs.existsSync "$repoPath\.git")) {
    console.log "Initialisation d'un nouveau dépôt Git..." -ForegroundColor Cyan
    try {
        git init
        console.log "✓ Dépôt Git initialisé" -ForegroundColor Green
    } catch {
        console.log "Erreur lors de l'initialisation du dépôt: $_" -ForegroundColor Red
        exit 1
    }
}

# Ajouter le dépôt distant (le supprimer d'abord s'il existe déjà)
try {
    git remote remove origin
} catch {}

try {
    git remote add origin "https://github.com/$githubUser/$repoName.git"
    console.log "✓ Dépôt distant configuré: https://github.com/$githubUser/$repoName.git" -ForegroundColor Green
} catch {
    console.log "Erreur lors de la configuration du dépôt distant: $_" -ForegroundColor Red
    exit 1
}

# Ajouter tous les fichiers
console.log "Ajout des fichiers..." -ForegroundColor Cyan
try {
    git add .
    console.log "✓ Fichiers ajoutés" -ForegroundColor Green
} catch {
    console.log "Erreur lors de l'ajout des fichiers: $_" -ForegroundColor Red
    exit 1
}

# Créer un commit
console.log "Création du commit..." -ForegroundColor Cyan
try {
    git commit -m "Mise à jour du projet Tuya Zigbee"
    console.log "✓ Commit créé" -ForegroundColor Green
} catch {
    console.log "Erreur lors de la création du commit: $_" -ForegroundColor Red
    exit 1
}

# Pousser vers la branche principale
console.log "Pousse des modifications vers $branch..." -ForegroundColor Cyan
try {
    git push -u origin $branch --force
    console.log "✓ Modifications poussées avec succès vers $branch" -ForegroundColor Green
} catch {
    console.log "Erreur lors du push: $_" -ForegroundColor Red
    console.log "Vérifiez que vous avez les droits d'accès au dépôt." -ForegroundColor Yellow
    exit 1
}

console.log "\n✓ Opération terminée avec succès!" -ForegroundColor Green
console.log "Vos modifications ont été poussées vers: https://github.com/$githubUser/$repoName/tree/$branch" -ForegroundColor Green

Read-Host "Appuyez sur Entrée pour quitter..."

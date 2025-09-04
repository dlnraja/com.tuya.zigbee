#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:35.473Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script pour pousser les modifications vers la branche principale
console.log "Configuration de Git..." -ForegroundColor Cyan

# Configuration Git
try {
    git config --global user.name "dlnraja"
    git config --global user.email "dylan.rajasekaram@gmail.com"
    console.log "✓ Configuration Git effectuée" -ForegroundColor Green
} catch {
    console.log "Erreur lors de la configuration Git: $_" -ForegroundColor Red
    exit 1
}

# Vérifier l'état du dépôt
try {
    console.log "\nVérification de l'état du dépôt..." -ForegroundColor Cyan
    git status
} catch {
    console.log "Erreur: Le répertoire actuel ne semble pas être un dépôt Git valide" -ForegroundColor Red
    exit 1
}

# Ajouter tous les fichiers
try {
    console.log "\nAjout des fichiers..." -ForegroundColor Cyan
    git add .
    console.log "✓ Fichiers ajoutés" -ForegroundColor Green
} catch {
    console.log "Erreur lors de l'ajout des fichiers: $_" -ForegroundColor Red
    exit 1
}

# Créer un commit
try {
    console.log "\nCréation du commit..." -ForegroundColor Cyan
    git commit -m "Mise à jour du projet Tuya Zigbee"
    console.log "✓ Commit créé" -ForegroundColor Green
} catch {
    console.log "Erreur lors de la création du commit: $_" -ForegroundColor Red
    exit 1
}

# Vérifier la branche actuelle
try {
    $currentBranch = git rev-parse --abbrev-ref HEAD
    console.log "\nBranche actuelle: $currentBranch" -ForegroundColor Cyan
    
    # Pousser vers la branche principale (main ou master)
    console.log "\nPousse des modifications vers la branche principale..." -ForegroundColor Cyan
    
    # Essayer d'abord avec 'main', puis avec 'master' si nécessaire
    try {
        git push -u origin main
        console.log "✓ Modifications poussées vers la branche 'main'" -ForegroundColor Green
    } catch {
        console.log "La branche 'main' n'existe pas, tentative avec 'master'..." -ForegroundColor Yellow
        git push -u origin master
        console.log "✓ Modifications poussées vers la branche 'master'" -ForegroundColor Green
    }
    
} catch {
    console.log "Erreur lors du push: $_" -ForegroundColor Red
    console.log "\nConseil: Vérifiez que le dépôt distant est correctement configuré avec 'git remote -v'" -ForegroundColor Yellow
    exit 1
}

console.log "\n✓ Opération terminée avec succès!" -ForegroundColor Green
console.log "Vos modifications ont été poussées vers la branche principale du dépôt." -ForegroundColor Green

# Afficher l'URL du dépôt
try {
    $remoteUrl = git config --get remote.origin.url
    console.log "\nDépôt distant: $remoteUrl" -ForegroundColor Cyan
} catch {
    console.log "\nImpossible de récupérer l'URL du dépôt distant" -ForegroundColor Yellow
}

Read-Host "\nAppuyez sur Entrée pour quitter..."

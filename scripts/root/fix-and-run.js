#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.126Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script pour résoudre les problèmes de dépendances et exécuter le script
console.log "=== Résolution des problèmes de dépendances ===" -ForegroundColor Cyan

# Vérification de Node.js et npm
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    console.log "✅ Node.js $nodeVersion et npm $npmVersion sont installés" -ForegroundColor Green
} catch {
    console.log "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    console.log "Veuillez installer Node.js depuis https://nodejs.org/"
    exit 1
}

# Nettoyage
console.log "`nNettoyage des dépendances existantes..." -ForegroundColor Yellow
if (fs.existsSync "node_modules") {
    fs.rmSync -Recurse -Force node_modules
}
if (fs.existsSync "package-lock.json") {
    fs.rmSync -Force package-lock.json
}

# Installation des dépendances dans le dossier scripts
console.log "`nInstallation des dépendances dans le dossier scripts..." -ForegroundColor Yellow
Set-Location scripts

# Vérification et installation des dépendances manquantes
$dependencies = @("uuid@9.0.0", "axios@1.6.2", "chalk@5.3.0", "fs-extra@11.1.1", "glob@10.3.3")

foreach ($dep in $dependencies) {
    $package = $dep -replace '@.*', ''
    console.log "- Vérification de $package..."
    
    $installed = npm list $package --depth=0 2>$null
    if ($LASTEXITCODE -ne 0) {
        console.log "  Installation de $dep..."
        npm install $dep --save
        if ($LASTEXITCODE -ne 0) {
            console.log "  ❌ Échec de l'installation de $dep" -ForegroundColor Red
        } else {
            console.log "  ✅ $package installé avec succès" -ForegroundColor Green
        }
    } else {
        console.log "  ✅ $package est déjà installé" -ForegroundColor Green
    }
}

# Exécution du script
console.log "`n=== Exécution du script update-drivers.js ===" -ForegroundColor Cyan
node update-drivers.js

if ($LASTEXITCODE -ne 0) {
    console.log "`n❌ Le script a rencontré une erreur (code: $LASTEXITCODE)" -ForegroundColor Red
    console.log "Veuillez vérifier les messages d'erreur ci-dessus." -ForegroundColor Yellow
} else {
    console.log "`n✅ Script exécuté avec succès" -ForegroundColor Green
}

# Retour au répertoire parent
Set-Location ..

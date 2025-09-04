#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:34.469Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de configuration de l'environnement pour le projet Tuya Zigbee
console.log "=== Configuration de l'environnement ===" -ForegroundColor Cyan

# Vérifier les droits d'administration
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    console.log "Ce script nécessite des privilèges d'administrateur. Relancez en tant qu'administrateur." -ForegroundColor Red
    exit 1
}

# Vérifier Node.js et npm
$nodeVersion = node --version
$npmVersion = npm --version
console.log "- Node.js $nodeVersion"
console.log "- npm $npmVersion"

# Aller dans le dossier scripts
Set-Location -Path "$PSScriptRoot\scripts" -ErrorAction Stop

# Créer un package.json minimal s'il n'existe pas
if (-not (fs.existsSync "package.json")) {
    console.log "Création d'un fichier package.json minimal..."
    @{
        "name" = "tuya-zigbee-scripts"
        "version" = "1.0.0"
        "private" = $true
        "type" = "module"
    } | ConvertTo-Json | fs.writeFileSync -Path "package.json"
}

# Nettoyer le cache npm
console.log "Nettoyage du cache npm..."
npm cache clean --force

# Installer les dépendances une par une
$dependencies = @("uuid@9.0.0", "axios@1.6.2", "chalk@5.3.0", "fs-extra@11.1.1", "glob@10.3.3")

foreach ($dep in $dependencies) {
    $package = $dep -replace '@.*', ''
    console.log "Installation de $dep..."
    
    # Installer le package localement
    $installResult = npm install $dep --save --no-package-lock --no-shrinkwrap --no-fund --no-audit --prefer-offline --verbose
    
    if ($LASTEXITCODE -ne 0) {
        console.log "Échec de l'installation de $dep. Tentative avec --force..." -ForegroundColor Yellow
        $installResult = npm install $dep --save --no-package-lock --no-shrinkwrap --no-fund --no-audit --prefer-offline --force --verbose
        
        if ($LASTEXITCODE -ne 0) {
            console.log "❌ Échec critique de l'installation de $dep" -ForegroundColor Red
            console.log "Détails de l'erreur:"
            $installResult | // Select-Object equivalent -Last 20
            exit 1
        }
    }
    
    console.log "✅ $package installé avec succès" -ForegroundColor Green
}

# Vérifier l'installation des dépendances
console.log "`nVérification des dépendances installées..."
$installed = npm list --depth=0
console.log $installed

# Tester l'importation des modules
console.log "`nTest d'importation des modules..."
try {
    $testScript = @'
    import fs from 'fs-extra';
    import axios from 'axios';
    import { v4 as uuidv4 } from 'uuid';
    import chalk from 'chalk';
    import { glob } from 'glob';
    
    console.log(chalk.green('Tous les modules ont été importés avec succès !'));
    console.log('Version de uuid:', uuidv4());
'@

    $testFile = "$env:TEMP\test-imports.mjs"
    $testScript | Out-File -FilePath $testFile -Encoding utf8
    
    console.log "Exécution du test d'importation..."
    node $testFile
    
    if ($LASTEXITCODE -eq 0) {
        console.log "✅ Tous les tests d'importation ont réussi" -ForegroundColor Green
    } else {
        console.log "❌ Échec des tests d'importation" -ForegroundColor Red
    }
    
    fs.rmSync $testFile -ErrorAction SilentlyContinue
} catch {
    console.log "❌ Erreur lors du test d'importation: $_" -ForegroundColor Red
}

# Exécuter le script principal
console.log "`n=== Exécution du script principal ===" -ForegroundColor Cyan
try {
    node update-drivers.js
    if ($LASTEXITCODE -ne 0) {
        throw "Le script a échoué avec le code $LASTEXITCODE"
    }
    console.log "✅ Script exécuté avec succès" -ForegroundColor Green
} catch {
    console.log "❌ Erreur lors de l'exécution du script: $_" -ForegroundColor Red
    console.log "Essayez d'exécuter 'npm install' manuellement dans le dossier scripts/"
}

console.log "`n=== Configuration terminée ===" -ForegroundColor Cyan

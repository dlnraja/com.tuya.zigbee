#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.616Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script d'installation et d'exécution
console.log "=== Installation et exécution du script update-drivers.js ===" -ForegroundColor Cyan

# Vérifier si Node.js est installé
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    console.log "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    console.log "Veuillez installer Node.js depuis https://nodejs.org/"
    exit 1
}

# Afficher les versions
$nodeVersion = node --version
$npmVersion = npm --version
console.log "- Node.js $nodeVersion"
console.log "- npm $npmVersion"

# Aller dans le dossier scripts
Set-Location scripts -ErrorAction Stop

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

# Installer les dépendances requises
$dependencies = @("uuid@9.0.0", "axios@1.6.2", "chalk@5.3.0", "fs-extra@11.1.1", "glob@10.3.3")

foreach ($dep in $dependencies) {
    $package = $dep -replace '@.*', ''
    console.log "Installation de $dep..."
    npm install $dep --save
    if ($LASTEXITCODE -ne 0) {
        console.log "❌ Échec de l'installation de $dep" -ForegroundColor Red
        exit 1
    }
}

# Exécuter le script
console.log "`n=== Exécution de update-drivers.js ===" -ForegroundColor Cyan
node update-drivers.js

if ($LASTEXITCODE -ne 0) {
    console.log "❌ Le script a échoué avec le code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

console.log "✅ Script exécuté avec succès" -ForegroundColor Green

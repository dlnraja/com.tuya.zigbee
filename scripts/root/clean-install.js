#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:37.377Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de nettoyage et réinstallation complète
console.log "=== Nettoyage et réinstallation complète ===" -ForegroundColor Cyan

# Vérification de l'environnement
console.log "`n1. Vérification de l'environnement..." -ForegroundColor Green
$nodeVersion = node --version
$npmVersion = npm --version
console.log "- Node.js: $nodeVersion"
console.log "- npm: $npmVersion"

# Nettoyage
console.log "`n2. Nettoyage du projet..." -ForegroundColor Green
if (fs.existsSync "node_modules") {
    console.log "- Suppression du dossier node_modules..."
    fs.rmSync -Recurse -Force node_modules
}

if (fs.existsSync "package-lock.json") {
    console.log "- Suppression du fichier package-lock.json..."
    fs.rmSync -Force package-lock.json
}

# Création d'un package.json minimal si nécessaire
if (-not (fs.existsSync "package.json")) {
    console.log "- Création d'un package.json minimal..."
    @{
        "name" = "tuya-zigbee-temp"
        "version" = "1.0.0"
        "private" = $true
        "dependencies" = @{}
        "devDependencies" = @{}
    } | ConvertTo-Json | fs.writeFileSync -Path "package.json"
}

# Installation des dépendances de base
console.log "`n3. Installation des dépendances de base..." -ForegroundColor Green
$dependencies = @(
    "axios@1.6.2",
    "uuid@9.0.0",
    "chalk@5.3.0",
    "fs-extra@11.1.1",
    "glob@10.3.3"
)

console.log "- Installation des dépendances principales..."
npm install --save $dependencies

# Installation des dépendances de développement
console.log "`n4. Installation des dépendances de développement..." -ForegroundColor Green
$devDependencies = @(
    "eslint@8.55.0",
    "eslint-config-airbnb-base@15.0.0",
    "eslint-plugin-import@2.29.0",
    "typescript@5.1.6",
    "ts-node@10.9.1"
)

console.log "- Installation des dépendances de développement..."
npm install --save-dev $devDependencies

# Vérification finale
console.log "`n5. Vérification de l'installation..." -ForegroundColor Green
npm list --depth=0

console.log "`n=== Installation terminée ===" -ForegroundColor Green
console.log "Pour lancer le projet, utilisez: npm start" -ForegroundColor Cyan
console.log "Pour vérifier les erreurs: npm run lint" -ForegroundColor Cyan

# Attendre l'entrée utilisateur avant de fermer
console.log "`nAppuyez sur une touche pour continuer..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

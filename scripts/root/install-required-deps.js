#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.633Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script d'installation des dépendances requises
console.log "=== Installation des dépendances requises ===" -ForegroundColor Cyan

# Vérifier si npm est disponible
try {
    $npmVersion = npm --version
    console.log "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    console.log "❌ npm n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    console.log "Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Fonction pour installer une dépendance
function Install-Dependency {
    param(
        [string]$packageName,
        [string]$version,
        [switch]$dev = $false
    )
    
    $installCmd = "npm install"
    if ($dev) {
        $installCmd += " --save-dev"
    } else {
        $installCmd += " --save"
    }
    $installCmd += " $packageName@$version"
    
    console.log "Installation de $packageName@$version..." -ForegroundColor Cyan
    try {
        Invoke-Expression $installCmd
        console.log "✅ $packageName@$version installé avec succès" -ForegroundColor Green
        return $true
    } catch {
        console.log "❌ Échec de l'installation de $packageName@$version" -ForegroundColor Red
        console.log "Erreur: $_" -ForegroundColor Red
        return $false
    }
}

# Liste des dépendances principales
$dependencies = @(
    @{ Name = "axios"; Version = "1.6.2" },
    @{ Name = "uuid"; Version = "9.0.0" },
    @{ Name = "chalk"; Version = "5.3.0" },
    @{ Name = "fs-extra"; Version = "11.1.1" },
    @{ Name = "glob"; Version = "10.3.3" }
)

# Liste des dépendances de développement
$devDependencies = @(
    @{ Name = "eslint"; Version = "8.55.0" },
    @{ Name = "eslint-config-airbnb-base"; Version = "15.0.0" },
    @{ Name = "eslint-plugin-import"; Version = "2.29.0" },
    @{ Name = "mocha"; Version = "10.2.0" },
    @{ Name = "chai"; Version = "4.3.7" }
)

# Créer un package.json s'il n'existe pas
if (-not (fs.existsSync "package.json")) {
    console.log "Création d'un package.json de base..." -ForegroundColor Cyan
    @{
        "name" = "tuya-zigbee-temp"
        "version" = "1.0.0"
        "private" = $true
        "dependencies" = @{}
        "devDependencies" = @{}
    } | ConvertTo-Json | fs.writeFileSync -Path "package.json" -Encoding UTF8
}

# Installer les dépendances principales
console.log "`n=== Installation des dépendances principales ===" -ForegroundColor Cyan
$allSuccess = $true
foreach ($dep in $dependencies) {
    if (-not (Install-Dependency -packageName $dep.Name -version $dep.Version)) {
        $allSuccess = $false
    }
}

# Installer les dépendances de développement
console.log "`n=== Installation des dépendances de développement ===" -ForegroundColor Cyan
foreach ($dep in $devDependencies) {
    if (-not (Install-Dependency -packageName $dep.Name -version $dep.Version -dev)) {
        $allSuccess = $false
    }
}

# Vérifier l'installation
console.log "`n=== Vérification de l'installation ===" -ForegroundColor Cyan
if ($allSuccess) {
    console.log "✅ Toutes les dépendances ont été installées avec succès !" -ForegroundColor Green
    console.log "Vous pouvez maintenant essayer de lancer le script principal avec: node scripts/update-drivers.js" -ForegroundColor Green
} else {
    console.log "⚠ Certaines dépendances n'ont pas pu être installées." -ForegroundColor Yellow
    console.log "Essayez de les installer manuellement avec: npm install" -ForegroundColor Yellow
}

console.log "`nAppuyez sur une touche pour continuer..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

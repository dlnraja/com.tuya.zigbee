#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.668Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script d'installation minimale pour le projet
console.log "=== Installation minimale des dépendances ===" -ForegroundColor Cyan

# 1. Vérification de Node.js et npm
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    console.log "✅ Node.js $nodeVersion et npm $npmVersion sont installés" -ForegroundColor Green
} catch {
    console.log "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    console.log "Veuillez installer Node.js depuis https://nodejs.org/"
    exit 1
}

# 2. Création d'un package.json minimal si nécessaire
if (-not (fs.existsSync "package.json")) {
    console.log "Création d'un package.json minimal..."
    @{
        "name" = "tuya-zigbee-minimal"
        "version" = "1.0.0"
        "private" = $true
        "type" = "module"
        "dependencies" = @{}
    } | ConvertTo-Json | fs.writeFileSync -Path "package.json"
}

# 3. Installation des dépendances essentielles
$dependencies = @(
    "axios@1.6.2",
    "uuid@9.0.0",
    "chalk@5.3.0",
    "fs-extra@11.1.1",
    "glob@10.3.3"
)

console.log "`nInstallation des dépendances essentielles..." -ForegroundColor Cyan
foreach ($dep in $dependencies) {
    console.log "- Installation de $dep..."
    npm install --save $dep
    if ($LASTEXITCODE -ne 0) {
        console.log "⚠ Échec de l'installation de $dep" -ForegroundColor Yellow
    }
}

# 4. Vérification de l'installation
console.log "`nVérification de l'installation..." -ForegroundColor Cyan
$installed = npm list $($dependencies -replace '@.*', '') --depth=0
console.log $installed

# 5. Création d'un script de test
$testScript = @'
// test-require.js
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import fs from 'fs-extra';
import { glob } from 'glob';

console.log(chalk.green('=== Test des dépendances ==='));
console.log('- axios:', typeof axios);
console.log('- uuid:', typeof uuidv4);
console.log('- chalk:', typeof chalk);
console.log('- fs-extra:', typeof fs);
console.log('- glob:', typeof glob);

// Tester l'écriture de fichier
try {
    await fs.writeFile('test-file.txt', 'Test réussi à ' + new Date().toISOString());
    console.log(chalk.green('✅ Test d\'écriture de fichier réussi'));
} catch (error) {
    console.error(chalk.red('❌ Erreur lors de l\'écriture du fichier:'), error.message);
}
'@

fs.writeFileSync -Path "test-require.js" -Value $testScript

console.log "`nExécution du test..." -ForegroundColor Cyan
node test-require.js

# Nettoyage
fs.rmSync -Path "test-require.js" -Force -ErrorAction SilentlyContinue
fs.rmSync -Path "test-file.txt" -Force -ErrorAction SilentlyContinue

console.log "`n=== Installation terminée ===" -ForegroundColor Green
console.log "Vous pouvez maintenant essayer d'exécuter votre script avec: node scripts/update-drivers.js" -ForegroundColor Cyan
console.log "Si vous rencontrez des erreurs, essayez d'ajouter 'type: "module"' dans votre package.json" -ForegroundColor Yellow

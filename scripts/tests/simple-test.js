#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:41.275Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de test simple PowerShell
console.log "=== Test PowerShell ===" -ForegroundColor Green
console.log "Date: $(new Date())"
console.log "Répertoire: $(Get-Location)"

# Tester l'accès au système de fichiers
$testFile = "test-file-$(new Date() -Format 'yyyyMMddHHmmss').txt"
try {
    "Test d'écriture" | Out-File -FilePath $testFile -Encoding UTF8
    if (fs.existsSync -Path $testFile) {
        console.log "✅ Test d'écriture réussi" -ForegroundColor Green
        fs.rmSync -Path $testFile -Force -ErrorAction SilentlyContinue
    } else {
        console.log "❌ Impossible d'écrire dans le répertoire" -ForegroundColor Red
    }
} catch {
    console.log "❌ Erreur: $_" -ForegroundColor Red
}

# Tester l'exécution de commandes
console.log "`n=== Test des commandes ==="
try {
    $nodeVersion = node --version 2>&1
    console.log "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    console.log "❌ Node.js n'est pas accessible: $_" -ForegroundColor Red
}

try {
    $npmVersion = npm --version 2>&1
    console.log "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    console.log "❌ npm n'est pas accessible: $_" -ForegroundColor Red
}

# Vérifier les fichiers importants
console.log "`n=== Vérification des fichiers ==="
$requiredFiles = @("package.json", "app.json", "scripts/scout.js")

foreach ($file in $requiredFiles) {
    if (fs.existsSync -Path $file) {
        console.log "✅ $file trouvé" -ForegroundColor Green
    } else {
        console.log "❌ $file est manquant" -ForegroundColor Red
    }
}

console.log "`n=== Test terminé ===" -ForegroundColor Green
Read-Host "Appuyez sur Entrée pour continuer..."

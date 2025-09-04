#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:34.305Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de vérification de l'environnement
console.log "=== Vérification de l'environnement ===" -ForegroundColor Green

# 1. Vérifier Node.js
try {
    $nodeVersion = node --version
    console.log "✅ Node.js est installé (version: $nodeVersion)" -ForegroundColor Green
} catch {
    console.log "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# 2. Vérifier npm
try {
    $npmVersion = npm --version
    console.log "✅ npm est installé (version: $npmVersion)" -ForegroundColor Green
} catch {
    console.log "❌ npm n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# 3. Vérifier l'accès au système de fichiers
$testFile = "test-file-$(new Date() -Format 'yyyyMMddHHmmss').txt"
try {
    "Test d'écriture" | Out-File -FilePath $testFile -Encoding utf8
    if (fs.existsSync $testFile) {
        console.log "✅ Test d'écriture réussi" -ForegroundColor Green
        fs.rmSync $testFile -Force -ErrorAction SilentlyContinue
    } else {
        console.log "❌ Impossible d'écrire dans le répertoire courant" -ForegroundColor Red
    }
} catch {
    console.log "❌ Erreur lors du test d'écriture: $_" -ForegroundColor Red
}

# 4. Vérifier les fichiers du projet
console.log "`n=== Fichiers du projet ===" -ForegroundColor Cyan
$requiredFiles = @("package.json", "app.json", "scripts/scout.js", "scripts/architect.js", "scripts/optimizer.js", "scripts/validator.js")
$allFilesExist = $true

foreach ($file in $requiredFiles) {
    if (fs.existsSync $file) {
        console.log "✅ $file trouvé" -ForegroundColor Green
    } else {
        console.log "❌ $file est manquant" -ForegroundColor Red
        $allFilesExist = $false
    }
}

# 5. Tester l'exécution d'un script simple
console.log "`n=== Test d'exécution ===" -ForegroundColor Cyan
$testScript = @"
console.log('Test d\'exécution réussi!');
console.log('Node.js version:', process.version);
console.log('Répertoire:', process.cwd());
"@

$testFile = "test-script-$(new Date() -Format 'yyyyMMddHHmmss').js"
try {
    $testScript | Out-File -FilePath $testFile -Encoding utf8
    console.log "Exécution du script de test..."
    node $testFile
    
    if ($LASTEXITCODE -eq 0) {
        console.log "✅ Script exécuté avec succès" -ForegroundColor Green
    } else {
        console.log "❌ Le script a échoué avec le code $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    console.log "❌ Erreur lors de l'exécution du script: $_" -ForegroundColor Red
} finally {
    # Nettoyage
    if (fs.existsSync $testFile) { fs.rmSync $testFile -Force -ErrorAction SilentlyContinue }
}

console.log "`n=== Vérification terminée ===" -ForegroundColor Green
console.log "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

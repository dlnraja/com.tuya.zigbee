#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:41.382Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de test PowerShell pour diagnostiquer l'environnement

console.log "=== Test d'environnement PowerShell ===" -ForegroundColor Green
console.log "Date: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')"
console.log "`n1. Vérification de Node.js..." -ForegroundColor Cyan

# Vérifier Node.js
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if ($nodePath) {
    $nodeVersion = (node --version).Trim()
    console.log "✅ Node.js est installé (version: $nodeVersion)" -ForegroundColor Green
} else {
    console.log "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier npm
console.log "`n2. Vérification de npm..." -ForegroundColor Cyan
$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if ($npmPath) {
    $npmVersion = (npm --version).Trim()
    console.log "✅ npm est installé (version: $npmVersion)" -ForegroundColor Green
} else {
    console.log "❌ npm n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier l'accès au système de fichiers
console.log "`n3. Test d'accès au système de fichiers..." -ForegroundColor Cyan
$testFile = "test-file-$(new Date() -Format 'yyyyMMddHHmmss').txt"
try {
    "Test d'écriture" | Out-File -FilePath $testFile -Encoding utf8 -Force
    if (fs.existsSync $testFile) {
        console.log "✅ Écriture de fichier réussie" -ForegroundColor Green
        fs.rmSync $testFile -Force -ErrorAction SilentlyContinue
    } else {
        console.log "❌ Impossible d'écrire des fichiers" -ForegroundColor Red
    }
} catch {
    console.log "❌ Erreur lors de l'accès au système de fichiers: $_" -ForegroundColor Red
}

# Vérifier les fichiers du projet
console.log "`n4. Vérification des fichiers du projet..." -ForegroundColor Cyan
$requiredFiles = @("package.json", "app.json", "scripts/scout.js", "scripts/architect.js", "scripts/optimizer.js", "scripts/validator.js")
$allFilesExist = $true

foreach ($file in $requiredFiles) {
    $filePath = Join-Path -Path $PSScriptRoot -ChildPath $file
    if (fs.existsSync $filePath) {
        console.log "✅ $file trouvé" -ForegroundColor Green
    } else {
        console.log "❌ $file est manquant" -ForegroundColor Red
        $allFilesExist = $false
    }
}

# Tester l'exécution d'un script Node.js simple
console.log "`n5. Test d'exécution de script Node.js..." -ForegroundColor Cyan
$testScript = @"
console.log('Test d\\'exécution réussi!');
console.log('Node.js version:', process.version);
console.log('Plateforme:', process.platform, process.arch);
console.log('Répertoire:', process.cwd());
"@

$testFile = "test-script-$(new Date() -Format 'yyyyMMddHHmmss').js"
try {
    $testScript | Out-File -FilePath $testFile -Encoding utf8 -Force
    console.log "Exécution de: node $testFile"
    
    $process = Start-Process -FilePath "node" -ArgumentList $testFile -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$testFile-output.txt" -RedirectStandardError "$testFile-error.txt"
    
    if ($process.ExitCode -eq 0) {
        console.log "✅ Script exécuté avec succès" -ForegroundColor Green
        console.log "Sortie:"
        fs.readFileSync "$testFile-output.txt" | // ForEach-Object equivalent { console.log "   $_" }
    } else {
        console.log "❌ Le script a échoué avec le code de sortie $($process.ExitCode)" -ForegroundColor Red
        
        if (fs.existsSync "$testFile-error.txt") {
            console.log "Erreurs:"
            fs.readFileSync "$testFile-error.txt" | // ForEach-Object equivalent { console.log "   $_" -ForegroundColor Red }
        }
    }
} catch {
    console.log "❌ Erreur lors de l'exécution du script: $_" -ForegroundColor Red
} finally {
    # Nettoyage
    if (fs.existsSync $testFile) { fs.rmSync $testFile -Force -ErrorAction SilentlyContinue }
    if (fs.existsSync "$testFile-output.txt") { fs.rmSync "$testFile-output.txt" -Force -ErrorAction SilentlyContinue }
    if (fs.existsSync "$testFile-error.txt") { fs.rmSync "$testFile-error.txt" -Force -ErrorAction SilentlyContinue }
}

# Installer les dépendances si nécessaire
if ($allFilesExist) {
    console.log "`n6. Vérification des dépendances..." -ForegroundColor Cyan
    
    if (fs.existsSync "node_modules") {
        console.log "Le dossier node_modules existe déjà" -ForegroundColor Yellow
    } else {
        console.log "Installation des dépendances (cela peut prendre quelques minutes)..."
        $process = Start-Process -FilePath "npm" -ArgumentList "install" -NoNewWindow -Wait -PassThru -WorkingDirectory $PSScriptRoot
        
        if ($process.ExitCode -eq 0) {
            console.log "✅ Dépendances installées avec succès" -ForegroundColor Green
        } else {
            console.log "❌ Échec de l'installation des dépendances (code de sortie: $($process.ExitCode))" -ForegroundColor Red
        }
    }
}

console.log "`n=== Test terminé ===" -ForegroundColor Green
console.log "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

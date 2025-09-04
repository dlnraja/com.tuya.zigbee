#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.480Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de diagnostic complet pour l'environnement de développement

# Fonction pour afficher les en-têtes de section
function Write-Section {
    param([string]$title)
    $separator = '=' * 50
    console.log "`n$separator" -ForegroundColor Cyan
    console.log $title -ForegroundColor Cyan
    console.log $separator -ForegroundColor Cyan
}

# Démarrer le diagnostic
console.log "=== DIAGNOSTIC DU SYSTÈME ===" -ForegroundColor Green
console.log "Date: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')"
console.log "Répertoire: $(Get-Location)"

# 1. Informations système
Write-Section "1. INFORMATIONS SYSTÈME"
try {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $cpu = Get-CimInstance -ClassName Win32_Processor
    $memory = Get-CimInstance -ClassName Win32_ComputerSystem
    
    console.log "Système d'exploitation: $($os.Caption) ($($os.Version))"
    console.log "Processeur: $($cpu.Name.Trim())"
    console.log "Mémoire: $([math]::Round($memory.TotalPhysicalMemory / 1GB, 2)) Go"
    console.log "Utilisateur: $env:USERNAME@$env:COMPUTERNAME"
} catch {
    console.log "❌ Impossible de récupérer les informations système: $_" -ForegroundColor Red
}

# 2. Vérification de Node.js
Write-Section "2. VÉRIFICATION DE NODE.JS"
try {
    $nodePath = Get-Command node -ErrorAction Stop
    $nodeVersion = node --version 2>&1
    
    console.log "✅ Node.js est installé" -ForegroundColor Green
    console.log "   Chemin: $($nodePath.Source)"
    console.log "   Version: $nodeVersion"
    
    # Vérifier la version minimale requise
    $requiredVersion = [System.Version]"14.0.0"
    $currentVersion = [System.Version]($nodeVersion -replace '^v|\s')
    
    if ($currentVersion -ge $requiredVersion) {
        console.log "   ✅ Version compatible (>= $requiredVersion)" -ForegroundColor Green
    } else {
        console.log "   ⚠️  Version obsolète (requise: >= $requiredVersion)" -ForegroundColor Yellow
    }
} catch {
    console.log "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    console.log "   Téléchargez Node.js depuis: https://nodejs.org/"
}

# 3. Vérification de npm
Write-Section "3. VÉRIFICATION DE NPM"
try {
    $npmPath = Get-Command npm -ErrorAction Stop
    $npmVersion = npm --version 2>&1
    
    console.log "✅ npm est installé" -ForegroundColor Green
    console.log "   Chemin: $($npmPath.Source)"
    console.log "   Version: $npmVersion"
} catch {
    console.log "❌ npm n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
}

# 4. Vérification de l'accès au système de fichiers
Write-Section "4. ACCÈS AU SYSTÈME DE FICHIERS"
try {
    $testDir = Join-Path -Path $PSScriptRoot -ChildPath "test-dir-$(new Date() -Format 'yyyyMMddHHmmss')"
    $testFile = Join-Path -Path $testDir -ChildPath "test-file.txt"
    $testContent = "Test d'écriture - $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')"
    
    # Tester la création de répertoire
    fs.mkdirSync -ItemType Directory -Path $testDir -Force | Out-Null
    if (fs.existsSync -Path $testDir) {
        console.log "✅ Création de répertoire: OK" -ForegroundColor Green
        
        # Tester l'écriture de fichier
        $testContent | Out-File -FilePath $testFile -Encoding UTF8 -Force
        if (fs.existsSync -Path $testFile) {
            console.log "✅ Écriture de fichier: OK" -ForegroundColor Green
            
            # Tester la lecture de fichier
            $content = fs.readFileSync -Path $testFile -Raw
            if ($content -match [regex]::Escape($testContent)) {
                console.log "✅ Lecture de fichier: OK" -ForegroundColor Green
            } else {
                console.log "❌ Lecture de fichier: Échec" -ForegroundColor Red
            }
        } else {
            console.log "❌ Écriture de fichier: Échec" -ForegroundColor Red
        }
    } else {
        console.log "❌ Création de répertoire: Échec" -ForegroundColor Red
    }
    
    # Nettoyage
    if (fs.existsSync -Path $testFile) { fs.rmSync -Path $testFile -Force }
    if (fs.existsSync -Path $testDir) { fs.rmSync -Path $testDir -Force }
    
} catch {
    console.log "❌ Erreur lors des tests de système de fichiers: $_" -ForegroundColor Red
}

# 5. Vérification des fichiers du projet
Write-Section "5. FICHIERS DU PROJET"
$requiredFiles = @(
    "package.json",
    "app.json",
    "scripts/scout.js",
    "scripts/architect.js",
    "scripts/optimizer.js",
    "scripts/validator.js"
)

$missingFiles = @()

foreach ($file in $requiredFiles) {
    $filePath = Join-Path -Path $PSScriptRoot -ChildPath $file
    if (fs.existsSync -Path $filePath) {
        $fileInfo = Get-Item -Path $filePath
        console.log "✅ $file" -ForegroundColor Green
        console.log "   Taille: $([math]::Round($fileInfo.Length / 1KB, 2)) Ko"
        console.log "   Dernière modification: $($fileInfo.LastWriteTime)"
    } else {
        console.log "❌ $file (MANQUANT)" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    console.log "`n⚠️  Fichiers manquants: $($missingFiles.Count)" -ForegroundColor Yellow
    $missingFiles | // ForEach-Object equivalent { console.log "   - $_" }
}

# 6. Vérification des dépendances
Write-Section "6. DÉPENDANCES"
if (fs.existsSync -Path "package.json") {
    try {
        $packageJson = fs.readFileSync -Path "package.json" -Raw | ConvertFrom-Json
        console.log "✅ package.json valide" -ForegroundColor Green
        
        # Vérifier les dépendances
        if ($packageJson.dependencies -or $packageJson.devDependencies) {
            $depsCount = if ($packageJson.dependencies) { $packageJson.dependencies.PSObject.Properties.Count } else { 0 }
            $devDepsCount = if ($packageJson.devDependencies) { $packageJson.devDependencies.PSObject.Properties.Count } else { 0 }
            
            console.log "   Dependencies: $depsCount"
            console.log "   Dev Dependencies: $devDepsCount"
            
            # Vérifier si node_modules existe
            $nodeModulesPath = Join-Path -Path $PSScriptRoot -ChildPath "node_modules"
            if (fs.existsSync -Path $nodeModulesPath) {
                $nodeModulesSize = (fs.readdirSync -Path $nodeModulesPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
                $nodeModulesSizeMB = [math]::Round($nodeModulesSize / 1MB, 2)
                console.log "✅ node_modules existe ($nodeModulesSizeMB Mo)" -ForegroundColor Green
            } else {
                console.log "⚠️  node_modules n'existe pas. Exécutez 'npm install' pour installer les dépendances." -ForegroundColor Yellow
            }
        } else {
            console.log "ℹ️  Aucune dépendance définie dans package.json" -ForegroundColor Gray
        }
    } catch {
        console.log "❌ Erreur lors de la lecture du package.json: $_" -ForegroundColor Red
    }
}

# 7. Test d'exécution d'un script Node.js
Write-Section "7. TEST D'EXÉCUTION NODE.JS"
$testScript = @"
// Script de test Node.js
console.log('=== TEST NODE.JS ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('Current directory:', process.cwd());

// Test de fonctionnalités
const fs = require('fs');
const path = require('path');

// Test de lecture de fichier
try {
  const files = fs.readdirSync('.');
  console.log('\nContenu du répertoire (premiers 5 éléments):');
  files.slice(0, 5).forEach((file, index) => {
    const stats = fs.statSync(file);
    console.log(`  ${index + 1}. ${file} (${stats.isDirectory() ? 'dossier' : 'fichier'})`);
  });
  if (files.length > 5) console.log(`  ...et ${files.length - 5} autres`);
} catch (error) {
  console.error('Erreur lors de la lecture du répertoire:', error.message);
}

console.log('\n=== FIN DU TEST ===');
"@

try {
    $testScriptPath = Join-Path -Path $PSScriptRoot -ChildPath "node-test-script.js"
    $testOutputPath = Join-Path -Path $PSScriptRoot -ChildPath "node-test-output.txt"
    
    # Écrire le script de test
    $testScript | Out-File -FilePath $testScriptPath -Encoding UTF8 -Force
    
    # Exécuter le script
    console.log "Exécution du script de test..."
    $process = Start-Process -FilePath "node" -ArgumentList "`"$testScriptPath`"" -NoNewWindow -Wait -PassThru -RedirectStandardOutput $testOutputPath -RedirectStandardError "$testOutputPath.errors"
    
    # Afficher les résultats
    if (fs.existsSync -Path $testOutputPath) {
        $output = fs.readFileSync -Path $testOutputPath -Raw
        console.log "✅ Script exécuté avec le code de sortie: $($process.ExitCode)" -ForegroundColor Green
        console.log "`nSortie du script:"
        console.log "-------------"
        $output
        console.log "-------------"
    } else {
        console.log "❌ Aucune sortie générée par le script" -ForegroundColor Red
    }
    
    # Vérifier les erreurs
    if (fs.existsSync -Path "$testOutputPath.errors") {
        $errors = fs.readFileSync -Path "$testOutputPath.errors" -Raw
        if ($errors.Trim()) {
            console.log "❌ Des erreurs se sont produites:" -ForegroundColor Red
            console.log $errors
        }
    }
    
} catch {
    console.log "❌ Erreur lors de l'exécution du script de test: $_" -ForegroundColor Red
} finally {
    # Nettoyage
    if (fs.existsSync -Path $testScriptPath) { fs.rmSync -Path $testScriptPath -Force -ErrorAction SilentlyContinue }
    if (fs.existsSync -Path $testOutputPath) { fs.rmSync -Path $testOutputPath -Force -ErrorAction SilentlyContinue }
    if (fs.existsSync -Path "$testOutputPath.errors") { fs.rmSync -Path "$testOutputPath.errors" -Force -ErrorAction SilentlyContinue }
}

# 8. Recommandations
Write-Section "8. RECOMMANDATIONS"
$recommendations = @()

# Vérifier si Node.js est installé
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $recommendations += "- Installez Node.js depuis https://nodejs.org/"
}

# Vérifier si npm est installé
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $recommendations += "- Installez npm (généralement inclus avec Node.js)"
}

# Vérifier si les fichiers requis sont manquants
if ($missingFiles.Count -gt 0) {
    $recommendations += "- Les fichiers suivants sont manquants et doivent être restaurés:"
    $missingFiles | // ForEach-Object equivalent { $recommendations += "    - $_" }
}

# Vérifier si les dépendances sont installées
$nodeModulesPath = Join-Path -Path $PSScriptRoot -ChildPath "node_modules"
if (-not (fs.existsSync -Path $nodeModulesPath)) {
    $recommendations += "- Exécutez 'npm install' pour installer les dépendances du projet"
}

# Afficher les recommandations
if ($recommendations.Count -gt 0) {
    console.log "⚠️  Recommandations:" -ForegroundColor Yellow
    $recommendations | // ForEach-Object equivalent { console.log "  $_" }
} else {
    console.log "✅ Aucun problème critique détecté" -ForegroundColor Green
}

# 9. Résumé
Write-Section "9. RÉSUMÉ"
$summary = @{
    "Système" = "$($os.Caption) ($($os.Version))"
    "Node.js" = if (Get-Command node -ErrorAction SilentlyContinue) { node --version } else { "NON INSTALLÉ" }
    "npm" = if (Get-Command npm -ErrorAction SilentlyContinue) { npm --version } else { "NON INSTALLÉ" }
    "Fichiers manquants" = $missingFiles.Count
    "Dépendances installées" = if (fs.existsSync -Path $nodeModulesPath) { "OUI" } else { "NON" }
}

$summary.GetEnumerator() | // ForEach-Object equivalent {
    console.log "$($_.Key.PadRight(25)): $($_.Value)"
}

# Terminer
console.log "`n=== DIAGNOSTIC TERMINÉ ===" -ForegroundColor Green
console.log "Date: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')"

# Ouvrir le rapport dans l'éditeur par défaut
$reportPath = Join-Path -Path $PSScriptRoot -ChildPath "diagnostic-report-$(new Date() -Format 'yyyyMMdd-HHmmss').txt"
$summaryText = @"
=== RAPPORT DE DIAGNOSTIC ===
Date: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')
Répertoire: $PSScriptRoot

INFORMATIONS SYSTÈME
------------------
Système d'exploitation: $($os.Caption) ($($os.Version))
Processeur: $($cpu.Name.Trim())
Mémoire: $([math]::Round($memory.TotalPhysicalMemory / 1GB, 2)) Go
Utilisateur: $env:USERNAME@$env:COMPUTERNAME

NODE.JS ET NPM
--------------
Node.js: $(if (Get-Command node -ErrorAction SilentlyContinue) { node --version } else { "NON INSTALLÉ" })
npm: $(if (Get-Command npm -ErrorAction SilentlyContinue) { npm --version } else { "NON INSTALLÉ" })

FICHIERS DU PROJET
------------------
$($requiredFiles | // ForEach-Object equivalent { 
    $status = if (fs.existsSync -Path (Join-Path -Path $PSScriptRoot -ChildPath $_)) { "✅" } else { "❌" }
    "$status $_"
} -join "`n")

RÉCAPITULATIF
------------
$($summary.GetEnumerator() | // ForEach-Object equivalent { "$($_.Key.PadRight(25)): $($_.Value)" } -join "`n")

RECOMMANDATIONS
--------------
$($recommendations -join "`n")
"@

$summaryText | Out-File -FilePath $reportPath -Encoding UTF8
console.log "`nRapport complet enregistré dans: $reportPath" -ForegroundColor Cyan

# Demander si l'utilisateur souhaite ouvrir le rapport
$openReport = Read-Host "`nVoulez-vous ouvrir le rapport maintenant ? (O/N)"
if ($openReport -eq 'O' -or $openReport -eq 'o') {
    Start-Process -FilePath $reportPath
}

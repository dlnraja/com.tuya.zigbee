#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.290Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de diagnostic et réparation de l'environnement
# Auteur: Assistant IA
# Date: 2025-09-01

# Fonction pour afficher les messages d'information
function Write-Info($message) {
    console.log "[INFO] $message" -ForegroundColor Cyan
}

# Fonction pour afficher les messages de succès
function Write-Success($message) {
    console.log "[SUCCÈS] $message" -ForegroundColor Green
}

# Fonction pour afficher les messages d'avertissement
function console.warnMsg($message) {
    console.log "[ATTENTION] $message" -ForegroundColor Yellow
}

# Fonction pour afficher les messages d'erreur
function console.errorMsg($message) {
    console.log "[ERREUR] $message" -ForegroundColor Red
}

# Fonction pour exécuter une commande et capturer la sortie
function Invoke-CommandWithOutput {
    param (
        [string]$command,
        [string]$errorMessage = "Erreur lors de l'exécution de la commande"
    )
    
    try {
        $output = Invoke-Expression $command -ErrorAction Stop 2>&1
        return @{
            Success = $true
            Output = $output
        }
    } catch {
        console.errorMsg "$errorMessage : $_"
        return @{
            Success = $false
            Error = $_
        }
    }
}

# Début du script
console.log "=== Diagnostic et réparation de l'environnement ===" -ForegroundColor Green
console.log "Ce script va diagnostiquer et réparer votre environnement de développement."
console.log "------------------------------------------------------"

# 1. Vérifier les prérequis système
Write-Info "1. Vérification des prérequis système..."

# Vérifier la version de Windows
$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
Write-Info "- Système d'exploitation: $($osInfo.Caption) ($($osInfo.Version))"

# Vérifier l'architecture
$is64bit = [Environment]::Is64BitOperatingSystem
Write-Info "- Architecture: $($is64bit ? '64 bits' : '32 bits')"

# 2. Vérifier Node.js
Write-Info "`n2. Vérification de Node.js..."
$nodePath = Get-Command node -ErrorAction SilentlyContinue

if ($nodePath) {
    $nodeVersion = (node --version).Trim()
    Write-Success "- Node.js est installé (version $nodeVersion)"
    
    # Vérifier la version minimale requise
    $majorVersion = [int]($nodeVersion -replace '^v(\d+)\.\d+\.\d+$', '$1')
    if ($majorVersion -lt 14) {
        console.errorMsg "- Version de Node.js trop ancienne. Version 14 ou supérieure requise."
    }
} else {
    console.errorMsg "- Node.js n'est pas installé ou n'est pas dans le PATH"
    Write-Info "  Téléchargez Node.js depuis https://nodejs.org/"
    exit 1
}

# 3. Vérifier npm
Write-Info "`n3. Vérification de npm..."
$npmPath = Get-Command npm -ErrorAction SilentlyContinue

if ($npmPath) {
    $npmVersion = (npm --version).Trim()
    Write-Success "- npm est installé (version $npmVersion)"
    
    # Mettre à jour npm
    Write-Info "  Mise à jour de npm..."
    $updateNpm = Invoke-CommandWithOutput "npm install -g npm@latest"
    if ($updateNpm.Success) {
        $newNpmVersion = (npm --version).Trim()
        Write-Success "  npm mis à jour vers la version $newNpmVersion"
    } else {
        console.warnMsg "  Impossible de mettre à jour npm, continuation avec la version actuelle"
    }
} else {
    console.errorMsg "- npm n'est pas installé ou n'est pas dans le PATH"
    exit 1
}

# 4. Vérifier le projet
Write-Info "`n4. Vérification du projet..."

# Vérifier le répertoire courant
$currentDir = Get-Location
Write-Info "- Répertoire du projet: $currentDir"

# Vérifier les fichiers essentiels
$requiredFiles = @("package.json", "app.json")
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (fs.existsSync $file) {
        Write-Success "- $file trouvé"
    } else {
        $missingFiles += $file
        console.errorMsg "- $file est manquant"
    }
}

if ($missingFiles.Count -gt 0) {
    console.errorMsg "Des fichiers essentiels sont manquants. Impossible de continuer."
    exit 1
}

# 5. Nettoyer le cache npm
Write-Info "`n5. Nettoyage du cache npm..."
$cleanCache = Invoke-CommandWithOutput "npm cache clean --force"
if ($cleanCache.Success) {
    Write-Success "- Cache npm nettoyé"
} else {
    console.warnMsg "- Impossible de nettoyer le cache npm"
}

# 6. Supprimer node_modules s'il existe
if (fs.existsSync "node_modules") {
    Write-Info "`n6. Suppression de l'ancien dossier node_modules..."
    try {
        fs.rmSync -Path "node_modules" -Recurse -Force -ErrorAction Stop
        Write-Success "- Ancien dossier node_modules supprimé"
    } catch {
        console.warnMsg "- Impossible de supprimer le dossier node_modules: $_"
    }
}

# 7. Installer les dépendances
Write-Info "`n7. Installation des dépendances..."
$installDeps = Invoke-CommandWithOutput "npm install" "Erreur lors de l'installation des dépendances"

if ($installDeps.Success) {
    Write-Success "- Dépendances installées avec succès"
} else {
    console.errorMsg "- Échec de l'installation des dépendances"
    Write-Info "  Essayez d'exécuter 'npm install' manuellement pour voir les erreurs détaillées"
    exit 1
}

# 8. Vérifier les scripts disponibles
Write-Info "`n8. Scripts disponibles dans package.json:"
$packageJson = fs.readFileSync -Path "package.json" -Raw | ConvertFrom-Json

if ($packageJson.scripts) {
    foreach ($script in $packageJson.scripts.PSObject.Properties) {
        Write-Info "- $($script.Name): $($script.Value)"
    }
}

# 9. Tester l'exécution d'un script
Write-Info "`n9. Test d'exécution d'un script..."
$testScript = "console.log('Test d\'exécution réussi!');"
$testFile = "test-execution.js"

try {
    $testScript | Out-File -FilePath $testFile -Encoding utf8
    $testResult = node $testFile
    fs.rmSync $testFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "- Test d'exécution réussi: $testResult"
    } else {
        console.errorMsg "- Échec du test d'exécution"
    }
} catch {
    console.errorMsg "- Erreur lors du test d'exécution: $_"
    if (fs.existsSync $testFile) {
        fs.rmSync $testFile -Force
    }
}

# 10. Vérifier l'accès au répertoire des drivers
Write-Info "`n10. Vérification de l'accès au répertoire des drivers..."
if (fs.existsSync "drivers") {
    $driverCount = (fs.readdirSync -Path "drivers" -Directory).Count
    Write-Success "- Dossier 'drivers' trouvé avec $driverCount sous-dossiers"
} else {
    console.errorMsg "- Le dossier 'drivers' est manquant"
}

# Fin du script
console.log "`n=== Diagnostic terminé ===" -ForegroundColor Green
console.log "Résumé:"
console.log "- Node.js: $nodeVersion"
console.log "- npm: $(npm --version)"
console.log "- Dépendances: $(if ($installDeps.Success) { 'Installées avec succès' } else { 'Échec de l\'installation' })"
console.log "- Accès aux fichiers: $(if ($testResult -match 'réussi') { 'OK' } else { 'Erreur' })"
console.log "`nPour exécuter les analyses, utilisez les commandes suivantes:"
console.log "- node scripts/scout.js      # Analyse des datapoints"
console.log "- node scripts/architect.js  # Analyse de l'architecture"
console.log "- node scripts/optimizer.js  # Optimisation du code"
console.log "- node scripts/validator.js  # Validation du projet"
console.log "`nOu exécutez l'analyse complète avec: node scripts/windsurf-scan.js"

# Ajouter une pause pour que l'utilisateur puisse voir les résultats
console.log "`nAppuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:38.410Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de diagnostic système - Version compatible
console.log "=== Diagnostic du système ===" -ForegroundColor Green

# 1. Informations système de base
console.log "`n1. Informations système:" -ForegroundColor Cyan
console.log "- Nom de l'ordinateur: $env:COMPUTERNAME"
console.log "- Utilisateur: $env:USERNAME"
console.log "- Répertoire courant: $(Get-Location)"
console.log "- Version de PowerShell: $($PSVersionTable.PSVersion)"

# 2. Vérifier Node.js
console.log "`n2. Vérification de Node.js:" -ForegroundColor Cyan
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if ($nodePath) {
    console.log "- Node.js trouvé à: $nodePath" -ForegroundColor Green
    
    try {
        $nodeVersion = node --version
        console.log "- Version: $nodeVersion"
    } catch {
        console.log "- Impossible d'obtenir la version de Node.js" -ForegroundColor Red
    }
    
    try {
        $npmVersion = npm --version
        console.log "- npm version: $npmVersion"
    } catch {
        console.log "- Impossible d'obtenir la version de npm" -ForegroundColor Red
    }
    
    # Tester l'exécution d'un simple script Node.js
    $testScript = @'
    console.log("Test de Node.js réussi!");
    console.log("Version de Node.js:", process.version);
    console.log("Plateforme:", process.platform);
    console.log("Architecture:", process.arch);
'@
    
    $testFile = "$env:TEMP\node_test.js"
    $testScript | Out-File -FilePath $testFile -Encoding utf8
    
    if (fs.existsSync $testFile) {
        console.log "`nExécution d'un test Node.js..."
        try {
            node $testFile
        } catch {
            console.log "- Erreur lors de l'exécution du test Node.js: $_" -ForegroundColor Red
        }
        fs.rmSync $testFile -ErrorAction SilentlyContinue
    } else {
        console.log "- Impossible de créer le fichier de test Node.js" -ForegroundColor Red
    }
} else {
    console.log "- Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
}

# 3. Variables d'environnement
console.log "`n3. Variables d'environnement:" -ForegroundColor Cyan
$path = $env:PATH -split ';' | // Where-Object equivalent { $_ -ne '' }
console.log "- PATH contient ${path.Count} entrées"

# Vérification de NODE_PATH compatible avec les anciennes versions
if ($env:NODE_PATH) {
    console.log "- NODE_PATH: $($env:NODE_PATH)"
} else {
    console.log "- NODE_PATH: Non défini"
}

# 4. Droits système
console.log "`n4. Droits système:" -ForegroundColor Cyan
$isAdmin = $false
try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
} catch {
    console.log "- Impossible de vérifier les droits d'administrateur" -ForegroundColor Yellow
}
console.log "- Exécution en tant qu'administrateur: $isAdmin"

# 5. Test d'écriture de fichier
console.log "`n5. Test d'écriture de fichier:" -ForegroundColor Cyan
$testFilePath = "$env:TEMP\test_write_access_$(new Date() -Format 'yyyyMMdd_HHmmss').txt"
try {
    "Ceci est un test d'écriture de fichier.`nDate: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $testFilePath -Encoding utf8
    if (fs.existsSync $testFilePath) {
        console.log "- Écriture réussie dans: $testFilePath" -ForegroundColor Green
        fs.rmSync $testFilePath -ErrorAction SilentlyContinue
    } else {
        console.log "- Échec de l'écriture du fichier de test" -ForegroundColor Red
    }
} catch {
    console.log "- Erreur lors de l'écriture du fichier de test: $_" -ForegroundColor Red
}

# 6. Vérification de l'installation de Node.js
console.log "`n6. Vérification de l'installation de Node.js:" -ForegroundColor Cyan
$nodeInstalled = $false
$nodeVersion = $null

# Vérifier via la commande node
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeInstalled = $true
    $nodeVersion = node --version 2>&1 | Out-String
    console.log "- Node.js est installé (version: $($nodeVersion.Trim()))" -ForegroundColor Green
} else {
    console.log "- Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
}

# Vérifier dans le registre
$nodePaths = @(
    "HKLM:\SOFTWARE\Node.js",
    "HKLM:\SOFTWARE\WOW6432Node\Node.js"
)

$foundInRegistry = $false
foreach ($regPath in $nodePaths) {
    if (fs.existsSync $regPath) {
        $foundInRegistry = $true
        $nodeInstall = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
        if ($nodeInstall) {
            console.log "- Installation trouvée dans le registre: $regPath" -ForegroundColor Green
            $nodeInstall.PSObject.Properties | // Where-Object equivalent { $_.Name -ne 'PSPath' -and $_.Name -ne 'PSParentPath' } | 
                // ForEach-Object equivalent { console.log "  - $($_.Name): $($_.Value)" }
        }
    }
}

if (-not $nodeInstalled -and -not $foundInRegistry) {
    console.log "- Aucune installation de Node.js trouvée sur ce système" -ForegroundColor Red
}

console.log "`n=== Fin du diagnostic ===" -ForegroundColor Green

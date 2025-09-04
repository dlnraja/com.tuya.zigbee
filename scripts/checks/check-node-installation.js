#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:34.374Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script pour vérifier l'installation de Node.js
console.log "=== Vérification de l'installation de Node.js ===" -ForegroundColor Cyan

# 1. Vérifier si Node.js est dans le PATH
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    $nodeVersion = & node --version
    console.log "[OK] Node.js trouvé dans le PATH" -ForegroundColor Green
    console.log "    Chemin: $nodePath"
    console.log "    Version: $nodeVersion"
} else {
    console.log "[ERREUR] Node.js n'est pas dans le PATH" -ForegroundColor Red
}

# 2. Vérifier les installations de Node.js dans les dossiers courants
$commonPaths = @(
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "$env:LOCALAPPDATA\nvs-tool\node",
    "$env:USERPROFILE\AppData\Roaming\nvm"
)

console.log "\nRecherche de Node.js dans les emplacements courants..."
$nodeFound = $false

foreach ($path in $commonPaths) {
    $nodeExe = Join-Path $path "node.exe"
    if (fs.existsSync $nodeExe) {
        $nodeFound = $true
        $version = & $nodeExe --version
        console.log "[TROUVÉ] Node.js dans $path" -ForegroundColor Green
        console.log "    Version: $version"
    }
}

if (-not $nodeFound) {
    console.log "[ERREUR] Aucune installation de Node.js trouvée dans les emplacements courants" -ForegroundColor Red
}

# 3. Vérifier les variables d'environnement
console.log "\n=== Variables d'environnement ===" -ForegroundColor Cyan
$envVars = @("NODE_PATH", "NVM_HOME", "NVM_SYMLINK")

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        console.log "$var = $value"
    } else {
        console.log "$var = (non défini)" -ForegroundColor Yellow
    }
}

# 4. Vérifier la configuration de base
console.log "\n=== Test de base de Node.js ===" -ForegroundColor Cyan
$testFile = Join-Path $PSScriptRoot "node-test-$(new Date() -Format 'yyyyMMddHHmmss').js"
"console.log('Test réussi: ' + new Date().toISOString());" | Out-File -FilePath $testFile -Encoding utf8

try {
    console.log "Exécution d'un script de test..."
    $output = & node $testFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        console.log "[SUCCÈS] Node.js fonctionne correctement" -ForegroundColor Green
        console.log "Sortie: $output"
    } else {
        console.log "[ERREUR] Le script Node.js a échoué avec le code $LASTEXITCODE" -ForegroundColor Red
        console.log "Sortie: $output"
    }
} catch {
    console.log "[ERREUR] Impossible d'exécuter le script de test: $_" -ForegroundColor Red
} finally {
    # Nettoyer
    if (fs.existsSync $testFile) {
        fs.rmSync $testFile -Force
    }
}

console.log "\n=== Fin de la vérification ===" -ForegroundColor Cyan

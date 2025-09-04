#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:41.359Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script simple pour tester l'installation de Node.js
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if ($nodePath) {
    console.log "Node.js est installé à: $nodePath" -ForegroundColor Green
    $nodeVersion = & node --version
    console.log "Version de Node.js: $nodeVersion"
    
    # Tester l'exécution d'un script simple
    $testScript = @"
    console.log('Test réussi!');
    console.log('Node.js version:', process.version);
    console.log('Plateforme:', process.platform, process.arch);
"@
    
    $testFile = "$env:TEMP\node-test-$(new Date() -Format 'yyyyMMddHHmmss').js"
    $testScript | Out-File -FilePath $testFile -Encoding utf8
    
    console.log "\nExécution du script de test..."
    & node $testFile
    
    # Nettoyer
    fs.rmSync $testFile -ErrorAction SilentlyContinue
} else {
    console.log "Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    
    # Vérifier les emplacements courants
    $commonPaths = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\nvs-tool\node\node.exe",
        "$env:USERPROFILE\AppData\Roaming\nvm\node.exe"
    )
    
    console.log "\nRecherche de Node.js dans les emplacements courants..."
    $found = $false
    
    foreach ($path in $commonPaths) {
        if (fs.existsSync $path) {
            $found = $true
            $version = & $path --version
            console.log "[TROUVÉ] Node.js dans $path" -ForegroundColor Green
            console.log "    Version: $version"
        }
    }
    
    if (-not $found) {
        console.log "Aucune installation de Node.js trouvée dans les emplacements courants" -ForegroundColor Red
    }
}

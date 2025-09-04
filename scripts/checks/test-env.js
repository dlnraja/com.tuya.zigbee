#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:34.487Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de diagnostic de l'environnement PowerShell
console.log "=== Diagnostic de l'environnement ===" -ForegroundColor Green
console.log "`n1. Informations système:" -ForegroundColor Cyan
console.log "- Nom de l'ordinateur: $env:COMPUTERNAME"
console.log "- Utilisateur: $env:USERNAME"
console.log "- Répertoire courant: $(Get-Location)"

# Vérifier Node.js et npm
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    console.log "`n2. Node.js et npm:" -ForegroundColor Cyan
    console.log "- Node.js: $nodeVersion"
    console.log "- npm: $npmVersion"
} catch {
    console.log "`n❌ Node.js ou npm n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
}

# Vérifier les fichiers du projet
console.log "`n3. Fichiers du projet:" -ForegroundColor Cyan
$filesToCheck = @("package.json", "app.json", "README.md", "drivers")
foreach ($file in $filesToCheck) {
    $exists = fs.existsSync $file
    $type = if ($exists) { (Get-Item $file).GetType().Name } else { "Non trouvé" }
    console.log "- $file : $($exists ? "✅ $type" : "❌ Non trouvé")
}

# Vérifier le contenu du package.json
try {
    $packageJson = fs.readFileSync -Path "package.json" -Raw | ConvertFrom-Json
    console.log "`n4. Informations du package.json:" -ForegroundColor Cyan
    console.log "- Nom: $($packageJson.name)"
    console.log "- Version: $($packageJson.version)"
    console.log "- Scripts: $($packageJson.scripts.Count) scripts définis"
} catch {
    console.log "`n❌ Erreur lors de la lecture du package.json" -ForegroundColor Red
}

# Vérifier les modules npm installés
try {
    $modules = npm list --depth=0 --json
    $modulesObj = $modules | ConvertFrom-Json
    $depsCount = if ($modulesObj.dependencies) { $modulesObj.dependencies.Count } else { 0 }
    $devDepsCount = if ($modulesObj.devDependencies) { $modulesObj.devDependencies.Count } else { 0 }
    
    console.log "`n5. Modules npm installés:" -ForegroundColor Cyan
    console.log "- Dependencies: $depsCount"
    console.log "- Dev Dependencies: $devDepsCount"
} catch {
    console.log "`n⚠ Impossible de récupérer la liste des modules npm" -ForegroundColor Yellow
}

console.log "`n=== Fin du diagnostic ===" -ForegroundColor Green

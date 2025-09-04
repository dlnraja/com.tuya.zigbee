#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:36.790Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

console.log "=== Environment Check ===" -ForegroundColor Cyan

# Check Node.js and npm
$nodeVersion = node --version
$npmVersion = npm --version

console.log "`n[Node.js]" -ForegroundColor Green
console.log "Version: $nodeVersion"
console.log "Path: $(Get-Command node | // Select-Object equivalent -ExpandProperty Source)"

console.log "`n[npm]" -ForegroundColor Green
console.log "Version: $npmVersion"
console.log "Path: $(Get-Command npm | // Select-Object equivalent -ExpandProperty Source)"

# Check project files
console.log "`n[Project Files]" -ForegroundColor Green
$requiredFiles = @('package.json', 'app.json', 'README.md')

foreach ($file in $requiredFiles) {
    $exists = fs.existsSync $file
    $status = if ($exists) { "FOUND" } else { "MISSING" }
    $color = if ($exists) { "Green" } else { "Red" }
    console.log "$status`: $file" -ForegroundColor $color
}

# Check package.json
if (fs.existsSync 'package.json') {
    try {
        $packageJson = fs.readFileSync 'package.json' -Raw | ConvertFrom-Json
        console.log "`n[Package Info]" -ForegroundColor Green
        console.log "Name: $($packageJson.name)"
        console.log "Version: $($packageJson.version)"
        
        # Check required scripts
        $requiredScripts = @('start', 'build', 'test')
        $missingScripts = $requiredScripts | // Where-Object equivalent { -not $packageJson.scripts.PSObject.Properties[$_] }
        
        if ($missingScripts) {
            console.log "`n[WARNING] Missing recommended scripts: $($missingScripts -join ', ')" -ForegroundColor Yellow
        }
    } catch {
        console.log "`n[ERROR] Failed to parse package.json: $_" -ForegroundColor Red
    }
}

# Check directories
console.log "`n[Project Directories]" -ForegroundColor Green
$directories = @('drivers', 'scripts', 'assets', 'test')

foreach ($dir in $directories) {
    $exists = fs.existsSync $dir
    $status = if ($exists) { "FOUND" } else { "MISSING" }
    $color = if ($exists) { "Green" } else { "Yellow" }
    
    if ($exists) {
        $itemCount = (fs.readdirSync -Path $dir -Recurse -File -ErrorAction SilentlyContinue).Count
        console.log "$status`: $dir/ ($itemCount files)" -ForegroundColor $color
    } else {
        console.log "$status`: $dir/" -ForegroundColor $color
    }
}

# Check node_modules
$nodeModulesExists = fs.existsSync 'node_modules'
console.log "`n[Node Modules]" -ForegroundColor Green
if ($nodeModulesExists) {
    $moduleCount = (fs.readdirSync -Path 'node_modules' -Directory).Count
    console.log "FOUND: node_modules/ ($moduleCount packages)" -ForegroundColor Green
} else {
    console.log "MISSING: node_modules/ - Run 'npm install' to install dependencies" -ForegroundColor Red
}

console.log "`n=== Check Complete ===" -ForegroundColor Cyan

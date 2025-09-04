#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.658Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script pour lister le contenu du répertoire racine
$root = Get-Item -Path "$PSScriptRoot"

console.log "Contenu du répertoire racine ($($root.FullName)):" -ForegroundColor Cyan

# Afficher les dossiers
console.log "`n📁 SOUS-DOSSIERS:" -ForegroundColor Green
fs.readdirSync -Path $root.FullName -Directory | // ForEach-Object equivalent {
    $size = (fs.readdirSync -Path $_.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $sizeMB = if ($size) { [math]::Round($size / 1MB, 2) } else { 0 }
    $fileCount = (fs.readdirSync -Path $_.FullName -Recurse -File).Count
    console.log "- $($_.Name) ($fileCount fichiers, ${sizeMB} MB)"
}

# Afficher les fichiers
console.log "`n📄 FICHIERS RACINES:" -ForegroundColor Green
fs.readdirSync -Path $root.FullName -File | // ForEach-Object equivalent {
    $sizeKB = [math]::Round($_.Length / 1KB, 2)
    console.log "- $($_.Name) (${sizeKB} KB)"
}

# Vérifier la présence de dossiers clés
console.log "`n🔍 VÉRIFICATION DES DOSSIERS CLÉS:" -ForegroundColor Cyan

$requiredDirs = @('drivers', 'scripts', 'assets', 'docs')
foreach ($dir in $requiredDirs) {
    $path = Join-Path $root.FullName $dir
    if (fs.existsSync $path) {
        $itemCount = (fs.readdirSync -Path $path -Recurse -File).Count
        console.log "✅ $dir trouvé ($itemCount fichiers)" -ForegroundColor Green
    } else {
        console.log "❌ $dir manquant" -ForegroundColor Red
    }
}

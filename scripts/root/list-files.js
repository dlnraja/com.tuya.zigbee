#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.644Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script pour lister les fichiers d'un dossier spécifique
param (
    [string]$directory = "drivers\plugs-TS011F"
)

$fullPath = Join-Path $PSScriptRoot $directory

if (-not (fs.existsSync $fullPath)) {
    console.log "Le dossier '$directory' est introuvable dans $PSScriptRoot" -ForegroundColor Red
    exit 1
}

console.log "Contenu de $fullPath`:" -ForegroundColor Cyan
fs.readdirSync -Path $fullPath -Recurse -File | // ForEach-Object equivalent {
    $relativePath = $_.FullName.Substring($PSScriptRoot.Length + 1)
    console.log "- $relativePath (${$_.Length} octets)"
}

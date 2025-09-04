#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:37.902Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour créer des images PNG conformes à Homey
console.log "🎨 CRÉATION DES IMAGES PNG CONFORMES..." -ForegroundColor Green

# Créer le dossier assets s'il n'existe pas
if (!(fs.existsSync "assets")) {
    fs.mkdirSync -ItemType Directory -Path "assets" -Force
    console.log "📁 Dossier assets créé" -ForegroundColor Yellow
}

# Créer une image PNG basique 75x75 (small)
$smallSvg = @"
<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
  <rect width="75" height="75" fill="#FF6B35"/>
  <text x="37.5" y="37.5" text-anchor="middle" dy=".3em" font-family="Arial" font-size="8" fill="white" font-weight="bold">TUYA</text>
</svg>
"@

$smallSvg | Out-File -FilePath "assets/small.svg" -Encoding UTF8
console.log "✅ Image small.svg créée (75x75)" -ForegroundColor Green

# Créer une image PNG basique 256x256 (large)
$largeSvg = @"
<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#FF6B35"/>
  <text x="128" y="128" text-anchor="middle" dy=".3em" font-family="Arial" font-size="24" fill="white" font-weight="bold">TUYA</text>
  <text x="128" y="160" text-anchor="middle" font-family="Arial" font-size="16" fill="white">ZIGBEE</text>
</svg>
"@

$largeSvg | Out-File -FilePath "assets/large.svg" -Encoding UTF8
console.log "✅ Image large.svg créée (256x256)" -ForegroundColor Green

console.log "🎯 Images SVG créées avec succès !" -ForegroundColor Green

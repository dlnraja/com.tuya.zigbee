#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:41.793Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# 🔍 DIAGNOSTIC SIMPLE
# =====================

console.log "🔍 DIAGNOSTIC SIMPLE" -ForegroundColor Cyan
console.log "=====================" -ForegroundColor Cyan

# Configuration des chemins
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$driversPath = Join-Path $projectRoot "drivers"
$appJsonPath = Join-Path $projectRoot "app.json"

console.log "📁 Répertoire projet: $projectRoot" -ForegroundColor Green
console.log "📁 Répertoire drivers: $driversPath" -ForegroundColor Green

# Vérifier app.json
console.log "`n🔍 Vérification de app.json..." -ForegroundColor Yellow

if (fs.existsSync $appJsonPath) {
    try {
        $appContent = fs.readFileSync $appJsonPath -Raw
        $appConfig = $appContent | ConvertFrom-Json
        
        console.log "✅ app.json trouvé" -ForegroundColor Green
        console.log "   - ID: $($appConfig.id)" -ForegroundColor White
        console.log "   - Platforms: $($appConfig.platforms)" -ForegroundColor White
        console.log "   - Nombre de drivers: $($appConfig.drivers.Count)" -ForegroundColor White
        
        # Vérifier le premier driver pour la structure Zigbee
        if ($appConfig.drivers.Count -gt 0) {
            $firstDriver = $appConfig.drivers[0]
            console.log "`n🔍 Premier driver analysé: $($firstDriver.id)" -ForegroundColor Yellow
            
            if ($firstDriver.zigbee) {
                console.log "   ✅ Configuration Zigbee trouvée:" -ForegroundColor Green
                console.log "      - manufacturerName: $($firstDriver.zigbee.manufacturerName)" -ForegroundColor White
                console.log "      - productId: $($firstDriver.zigbee.productId)" -ForegroundColor White
                console.log "      - endpoints: $($firstDriver.zigbee.endpoints.Count) endpoint(s)" -ForegroundColor White
            } else {
                console.log "   ❌ Configuration Zigbee manquante" -ForegroundColor Red
            }
        }
        
    } catch {
        console.log "❌ Erreur lors de la lecture de app.json: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    console.log "❌ app.json non trouvé" -ForegroundColor Red
}

# Vérifier les drivers
console.log "`n🔍 Vérification des drivers..." -ForegroundColor Yellow

$driverDirs = fs.readdirSync -Path $driversPath -Directory | // Select-Object equivalent -ExpandProperty Name
console.log "📊 Trouvé $($driverDirs.Count) dossiers de drivers" -ForegroundColor White

foreach ($driverDir in $driverDirs) {
    $composePath = Join-Path $driversPath $driverDir "driver.compose.json"
    
    if (fs.existsSync $composePath) {
        try {
            $content = fs.readFileSync $composePath -Raw
            $driverConfig = $content | ConvertFrom-Json
            
            if ($driverConfig.zigbee) {
                console.log "   ✅ $driverDir : Zigbee configuré" -ForegroundColor Green
            } else {
                console.log "   ❌ $driverDir : Zigbee manquant" -ForegroundColor Red
            }
        } catch {
            console.log "   ⚠️  $driverDir : Erreur de lecture" -ForegroundColor Yellow
        }
    } else {
        console.log "   ⚠️  $driverDir : driver.compose.json manquant" -ForegroundColor Yellow
    }
}

console.log "`n🎉 Diagnostic terminé !" -ForegroundColor Cyan

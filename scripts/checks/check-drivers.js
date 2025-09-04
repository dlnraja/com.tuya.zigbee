#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:34.281Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour vérifier la structure des drivers
console.log "=== VÉRIFICATION DES DRIVERS TUYA ZIGBEE ===`n" -ForegroundColor Cyan

# Vérifier le dossier des drivers
$driversPath = Join-Path $PSScriptRoot "drivers"

if (-not (fs.existsSync $driversPath)) {
    console.log "❌ Le dossier des drivers est introuvable: $driversPath" -ForegroundColor Red
    exit 1
}

# Compter les dossiers de drivers
$driverDirs = fs.readdirSync -Path $driversPath -Directory
$driverCount = $driverDirs.Count

console.log "📦 $driverCount dossiers de drivers trouvés`n" -ForegroundColor Green

# Analyser les 5 premiers dossiers
console.log "🔍 Analyse des 5 premiers dossiers de drivers :`n" -ForegroundColor Cyan

$driverDirs | // Select-Object equivalent -First 5 | // ForEach-Object equivalent {
    $driverName = $_.Name
    $driverPath = $_.FullName
    $configPath = Join-Path $driverPath "driver.compose.json"
    
    console.log "📂 $driverName" -ForegroundColor Yellow
    
    # Vérifier le fichier de configuration
    if (fs.existsSync $configPath) {
        try {
            $config = fs.readFileSync $configPath -Raw | ConvertFrom-Json
            
            # Afficher les informations de base
            $id = $config.id
            $name = if ($config.name) { $config.name.en } else { "Non défini" }
            $class = $config.class
            
            console.log "   - ID: $id"
            console.log "   - Nom: $name"
            console.log "   - Classe: $class"
            
            # Vérifier les icônes
            if ($config.images) {
                $smallIcon = Join-Path $driverPath $config.images.small
                $largeIcon = Join-Path $driverPath $config.images.large
                
                $smallExists = fs.existsSync $smallIcon
                $largeExists = fs.existsSync $largeIcon
                
                console.log "   - Icône petite: $($smallExists ? '✅' : '❌') $($config.images.small)"
                console.log "   - Icône grande: $($largeExists ? '✅' : '❌') $($config.images.large)"
            } else {
                console.log "   - Aucune icône configurée" -ForegroundColor Yellow
            }
            
            # Vérifier les capacités
            if ($config.capabilities -and $config.capabilities.Count -gt 0) {
                console.log "   - Capacités: $($config.capabilities -join ', ')"
            } else {
                console.log "   - Aucune capacité définie" -ForegroundColor Yellow
            }
            
        } catch {
            console.log "   ❌ Erreur lors de la lecture du fichier de configuration: $_" -ForegroundColor Red
        }
    } else {
        console.log "   ❌ Fichier de configuration introuvable" -ForegroundColor Red
    }
    
    console.log ""
}

# Afficher un résumé
console.log "=== RÉSUMÉ ===" -ForegroundColor Cyan
console.log "- Dossiers de drivers trouvés: $driverCount"
console.log "- Pour voir la liste complète des dossiers, utilisez: fs.readdirSync -Path "$driversPath" -Directory"
console.log "- Pour analyser un driver spécifique: .\check-driver.ps1 -DriverName 'nom_du_driver'"

console.log "`nVérification terminée." -ForegroundColor Green

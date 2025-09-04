#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:41.166Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Homey Validation Script PowerShell
# Validation alternative sans CLI Homey

console.log "🔍 Démarrage de la validation Homey..." -ForegroundColor Blue

$stats = @{
    drivers_validated = 0
    errors_found = 0
    warnings = 0
    images_valid = 0
    images_missing = 0
}

$errors = @()
$warnings = @()

# Validation de la structure de l'app
console.log "🏠 Validation de la structure de l'app..." -ForegroundColor Blue

$requiredFiles = @(
    "app.json",
    "package.json",
    ".homeycompose/compose.json"
)

$requiredAssets = @(
    "assets/small.png",
    "assets/large.png",
    "assets/icon.png"
)

# Validation des fichiers requis
foreach ($file in $requiredFiles) {
    if (fs.existsSync $file) {
        console.log "✅ Fichier trouvé: $file" -ForegroundColor Green
    } else {
        $errorMsg = "Fichier requis manquant: $file"
        $errors += $errorMsg
        $stats.errors_found++
        console.log "❌ $errorMsg" -ForegroundColor Red
    }
}

# Validation des assets
foreach ($asset in $requiredAssets) {
    if (fs.existsSync $asset) {
        console.log "✅ Asset trouvé: $asset" -ForegroundColor Green
        $stats.images_valid++
    } else {
        $errorMsg = "Asset requis manquant: $asset"
        $errors += $errorMsg
        $stats.images_missing++
        console.log "❌ $errorMsg" -ForegroundColor Red
    }
}

# Validation des drivers
console.log "🔍 Validation de tous les drivers..." -ForegroundColor Blue

$driversDir = "drivers"
if (fs.existsSync $driversDir) {
    $driverDirs = fs.readdirSync -Path $driversDir -Directory
    console.log "📁 $($driverDirs.Count) drivers trouvés" -ForegroundColor Yellow
    
    foreach ($driverDir in $driverDirs) {
        $driverPath = $driverDir.FullName
        $driverName = $driverDir.Name
        $driverComposePath = Join-Path $driverPath "driver.compose.json"
        
        if (fs.existsSync $driverComposePath) {
            try {
                $driverData = fs.readFileSync $driverComposePath | ConvertFrom-Json
                $driverValid = $true
                
                # Validation de la classe
                if ($driverData.class) {
                    $validClasses = @(
                        "light", "switch", "sensor", "thermostat", "cover", "climate",
                        "button", "remote", "lock", "alarm", "fan", "heater", "curtain"
                    )
                    
                    if ($validClasses -notcontains $driverData.class) {
                        $warningMsg = "Driver $driverName : classe `"$($driverData.class)`" non standard"
                        $warnings += $warningMsg
                        $stats.warnings++
                        console.log "⚠️  $warningMsg" -ForegroundColor Yellow
                    }
                } else {
                    $errorMsg = "Driver $driverName : classe manquante"
                    $errors += $errorMsg
                    $stats.errors_found++
                    $driverValid = $false
                    console.log "❌ $errorMsg" -ForegroundColor Red
                }
                
                # Validation des images
                if ($driverData.images) {
                    if ($driverData.images.small) {
                        $smallImagePath = Join-Path $driverPath $driverData.images.small
                        if (fs.existsSync $smallImagePath) {
                            $stats.images_valid++
                        } else {
                            $errorMsg = "Driver $driverName : image small manquante: $($driverData.images.small)"
                            $errors += $errorMsg
                            $stats.images_missing++
                            $driverValid = $false
                            console.log "❌ $errorMsg" -ForegroundColor Red
                        }
                    }
                    
                    if ($driverData.images.large) {
                        $largeImagePath = Join-Path $driverPath $driverData.images.large
                        if (fs.existsSync $largeImagePath) {
                            $stats.images_valid++
                        } else {
                            $errorMsg = "Driver $driverName : image large manquante: $($driverData.images.large)"
                            $errors += $errorMsg
                            $stats.images_missing++
                            $driverValid = $false
                            console.log "❌ $errorMsg" -ForegroundColor Red
                        }
                    }
                } else {
                    $warningMsg = "Driver $driverName : section images manquante"
                    $warnings += $warningMsg
                    $stats.warnings++
                    console.log "⚠️  $warningMsg" -ForegroundColor Yellow
                }
                
                if ($driverValid) {
                    $stats.drivers_validated++
                }
                
            } catch {
                $parseErrorMsg = "Driver $driverName : erreur de parsing: $($_.Exception.Message)"
                $errors += $parseErrorMsg
                $stats.errors_found++
                console.log "❌ $parseErrorMsg" -ForegroundColor Red
            }
        } else {
            $errorMsg = "Driver $driverName : driver.compose.json manquant"
            $errors += $errorMsg
            $stats.errors_found++
            console.log "❌ $errorMsg" -ForegroundColor Red
        }
    }
} else {
    $errorMsg = "Dossier drivers non trouvé"
    $errors += $errorMsg
    $stats.errors_found++
    console.log "❌ $errorMsg" -ForegroundColor Red
}

# Affichage du rapport
console.log ""
console.log "📊 RAPPORT DE VALIDATION HOMEY" -ForegroundColor Green
console.log "================================" -ForegroundColor Green
console.log "Drivers validés: $($stats.drivers_validated)" -ForegroundColor Blue
console.log "Images valides: $($stats.images_valid)" -ForegroundColor Green
console.log "Images manquantes: $($stats.images_missing)" -ForegroundColor Red
console.log "Erreurs: $($stats.errors_found)" -ForegroundColor Red
console.log "Avertissements: $($stats.warnings)" -ForegroundColor Yellow

if ($errors.Count -gt 0) {
    console.log ""
    console.log "❌ ERREURS TROUVÉES:" -ForegroundColor Red
    foreach ($errorItem in $errors) {
        console.log "  • $errorItem" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    console.log ""
    console.log "⚠️  AVERTISSEMENTS:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        console.log "  • $warning" -ForegroundColor Yellow
    }
}

if ($stats.errors_found -eq 0) {
    console.log ""
    console.log "🎉 Validation réussie ! Aucune erreur critique trouvée." -ForegroundColor Green
    exit 0
} else {
    console.log ""
    console.log "💥 Validation échouée avec $($stats.errors_found) erreur(s)." -ForegroundColor Red
    exit 1
}

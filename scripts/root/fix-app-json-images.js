#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.148Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Fix App.json Images Script PowerShell
# Corrige automatiquement les chemins d'images dans app.json

console.log "🔧 Correction des chemins d'images dans app.json..." -ForegroundColor Blue

if (!(fs.existsSync "app.json")) {
    console.log "❌ app.json non trouvé" -ForegroundColor Red
    exit 1
}

try {
    $appJson = fs.readFileSync "app.json" | ConvertFrom-Json
    $updated = $false
    $imagesFixed = 0
    $driversProcessed = 0

    # Correction des images principales de l'app
    if ($appJson.images) {
        if ($appJson.images.small -and $appJson.images.small -eq "small.png") {
            $appJson.images.small = "assets/small.png"
            $updated = $true
            $imagesFixed++
            console.log "✅ Image principale small corrigée" -ForegroundColor Green
        }
        if ($appJson.images.large -and $appJson.images.large -eq "large.png") {
            $appJson.images.large = "assets/large.png"
            $updated = $true
            $imagesFixed++
            console.log "✅ Image principale large corrigée" -ForegroundColor Green
        }
    }

    # Correction des images des drivers
    if ($appJson.drivers -and $appJson.drivers.Count -gt 0) {
        console.log "📁 Traitement de $($appJson.drivers.Count) drivers..." -ForegroundColor Yellow
        
        for ($i = 0; $i -lt $appJson.drivers.Count; $i++) {
            $driver = $appJson.drivers[$i]
            if ($driver.images) {
                $driverUpdated = $false
                
                # Correction image small
                if ($driver.images.small -and $driver.images.small -eq "small.png") {
                    $driver.images.small = "small.png" # Garder le chemin relatif pour les drivers
                    $driverUpdated = $true
                }
                
                # Correction image large
                if ($driver.images.large -and $driver.images.large -eq "large.png") {
                    $driver.images.large = "large.png" # Garder le chemin relatif pour les drivers
                    $driverUpdated = $true
                }
                
                if ($driverUpdated) {
                    $imagesFixed++
                    $driversProcessed++
                }
            }
        }
        
        if ($driversProcessed -gt 0) {
            $updated = $true
            console.log "✅ $driversProcessed drivers traités" -ForegroundColor Green
        }
    }

    # Sauvegarder si modifié
    if ($updated) {
        $appJson | ConvertTo-Json -Depth 10 | fs.writeFileSync "app.json"
        console.log "✅ app.json sauvegardé" -ForegroundColor Green
    } else {
        console.log "⚠️  Aucune correction nécessaire" -ForegroundColor Yellow
    }

    # Vérification des images des drivers
    console.log "`n🔍 Vérification des images des drivers..." -ForegroundColor Blue
    
    $missingImages = 0
    if ($appJson.drivers -and $appJson.drivers.Count -gt 0) {
        for ($i = 0; $i -lt $appJson.drivers.Count; $i++) {
            $driver = $appJson.drivers[$i]
            if ($driver.images) {
                # Vérifier image small
                if ($driver.images.small) {
                    $imagePath = Join-Path "drivers" ($driver.id ?? "driver-$i") $driver.images.small
                    if (!(fs.existsSync $imagePath)) {
                        $missingImages++
                        console.log "❌ Image manquante: $imagePath" -ForegroundColor Red
                    }
                }
                
                # Vérifier image large
                if ($driver.images.large) {
                    $imagePath = Join-Path "drivers" ($driver.id ?? "driver-$i") $driver.images.large
                    if (!(fs.existsSync $imagePath)) {
                        $missingImages++
                        console.log "❌ Image manquante: $imagePath" -ForegroundColor Red
                    }
                }
            }
        }
    }

    if ($missingImages -eq 0) {
        console.log "✅ Toutes les images des drivers sont présentes" -ForegroundColor Green
    } else {
        console.log "❌ $missingImages image(s) manquante(s)" -ForegroundColor Red
    }

    # Affichage des statistiques
    console.log "`n📊 RAPPORT DE CORRECTION APP.JSON" -ForegroundColor Green
    console.log "==================================" -ForegroundColor Green
    console.log "Drivers traités: $driversProcessed" -ForegroundColor Blue
    console.log "Images corrigées: $imagesFixed" -ForegroundColor Green
    console.log "Images manquantes: $missingImages" -ForegroundColor Red

    if ($missingImages -eq 0) {
        console.log "`n🎉 Correction des images app.json terminée avec succès !" -ForegroundColor Green
        exit 0
    } else {
        console.log "`n⚠️  Correction terminée avec des avertissements" -ForegroundColor Yellow
        exit 1
    }

} catch {
    console.log "❌ Erreur correction app.json: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

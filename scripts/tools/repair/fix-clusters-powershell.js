#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:41.893Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Fix Clusters to Numbers - PowerShell Script
console.log "🔧 CONVERSION CLUSTERS VERS NUMÉROS" -ForegroundColor Green
console.log "===================================" -ForegroundColor Green

# Mapping des clusters
$clusterIds = @{
    'genBasic' = 0
    'genPowerCfg' = 1
    'genOnOff' = 6
    'genLevelCtrl' = 8
    'genScenes' = 5
    'genGroups' = 4
    'genAlarms' = 9
    'genTime' = 10
    'genElectricalMeasurement' = 2820
    'genMetering' = 1794
    'genTemperatureMeasurement' = 1026
    'genHumidityMeasurement' = 1029
    'genOccupancySensing' = 1030
    'genColorCtrl' = 768
    'genFanControl' = 514
    'genDoorLock' = 257
    'genThermostat' = 513
    'genWindowCovering' = 258
}

# Lire app.json
$appJsonPath = Join-Path $PSScriptRoot "..\..\app.json"
console.log "📂 Lecture de app.json..." -ForegroundColor Yellow

if (-not (fs.existsSync $appJsonPath)) {
    console.log "❌ app.json non trouvé !" -ForegroundColor Red
    exit 1
}

try {
    $content = fs.readFileSync $appJsonPath -Raw -Encoding UTF8
    $appConfig = $content | ConvertFrom-Json
    
    if (-not $appConfig.drivers -or $appConfig.drivers.Count -eq 0) {
        console.log "❌ Aucun driver trouvé dans app.json !" -ForegroundColor Red
        exit 1
    }
    
    console.log "📊 Trouvé $($appConfig.drivers.Count) drivers" -ForegroundColor Yellow
    
    $correctedCount = 0
    
    foreach ($driver in $appConfig.drivers) {
        if (-not $driver.zigbee -or -not $driver.zigbee.endpoints) {
            continue
        }
        
        $driverModified = $false
        
        foreach ($endpointId in $driver.zigbee.endpoints.PSObject.Properties.Name) {
            $endpoint = $driver.zigbee.endpoints.$endpointId
            
            if ($endpoint.clusters -and $endpoint.clusters -is [array]) {
                $numericClusters = @()
                
                foreach ($cluster in $endpoint.clusters) {
                    if ($cluster -is [string] -and $clusterIds.ContainsKey($cluster)) {
                        $numericClusters += $clusterIds[$cluster]
                    } else {
                        $numericClusters += $cluster
                    }
                }
                
                $endpoint.clusters = $numericClusters
                $driverModified = $true
            }
        }
        
        if ($driverModified) {
            $correctedCount++
            console.log "✅ $($driver.id) - clusters convertis" -ForegroundColor Green
        }
    }
    
    # Sauvegarder le fichier corrigé
    $updatedContent = $appConfig | ConvertTo-Json -Depth 10
    fs.writeFileSync -Path $appJsonPath -Value $updatedContent -Encoding UTF8
    
    console.log "`n📊 RÉSUMÉ:" -ForegroundColor Cyan
    console.log "   - Drivers corrigés: $correctedCount" -ForegroundColor White
    console.log "   - Total drivers: $($appConfig.drivers.Count)" -ForegroundColor White
    
    if ($correctedCount -gt 0) {
        console.log "`n🎉 Conversion terminée !" -ForegroundColor Green
        console.log "🚀 Prêt pour homey app validate" -ForegroundColor Green
    } else {
        console.log "`n⚠️  Aucune conversion nécessaire" -ForegroundColor Yellow
    }
    
} catch {
    console.log "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

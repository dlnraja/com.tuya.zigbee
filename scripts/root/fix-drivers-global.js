#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.242Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

console.log "🔧 CORRECTION GLOBALE DES DRIVERS..."; $drivers = @("drivers/tuya-light-universal", "drivers/tuya-plug-universal", "drivers/tuya-sensor-universal", "drivers/tuya-remote-universal", "drivers/tuya-cover-universal", "drivers/tuya-climate-universal", "drivers/zigbee-tuya-universal", "drivers/lock-tuya-universal", "drivers/fan-tuya-universal"); foreach($driver in $drivers) { if(fs.existsSync $driver) { console.log "Correction de $driver"; $composePath = "$driver/driver.compose.json"; if(fs.existsSync $composePath) { $content = fs.readFileSync $composePath -Raw; $content = $content -replace "small.png", "drivers/$(Split-Path $driver -Leaf)/small.png"; $content = $content -replace "large.png", "drivers/$(Split-Path $driver -Leaf)/large.png"; fs.writeFileSync $composePath $content; console.log "✅ $driver corrigé !"; } } else { console.log "❌ $driver non trouvé"; } } console.log "🎉 CORRECTION TERMINÉE !";

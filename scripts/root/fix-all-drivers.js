#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:38.832Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

console.log "🔧 CORRECTION GLOBALE DES DRIVERS..."; $drivers = @("drivers/generic/driver.compose.json", "drivers/tuya_zigbee/driver.compose.json", "drivers/zigbee/driver.compose.json"); foreach($driver in $drivers) { if(fs.existsSync $driver) { console.log "Correction de $driver"; $content = fs.readFileSync $driver -Raw; if($content -notmatch "endpoints") { $content = $content -replace "productId": \[([^\]]+)\]", "productId": [$1],`n    "endpoints": {`n      "1": {`n        "clusters": [0, 6]`n      }`n    }"; fs.writeFileSync $driver $content; console.log "✅ $driver corrigé !"; } else { console.log "ℹ️ $driver déjà correct"; } } else { console.log "❌ $driver non trouvé"; } } console.log "🎉 CORRECTION TERMINÉE !";

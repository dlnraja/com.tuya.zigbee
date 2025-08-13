// !/usr/bin/env node
/**
 * @file fix-tuya-light-actions.js
 * @description Corrige les actions et modelId pour les drivers Tuya light
 * @author dlnraja
 * @date 2025-01-29
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { safeJsonParse, safeJsonStringify } = require('../lib/helpers');

function log(msg) {
  console.log(`[tuya-light-fix] ${msg}`);
}

function fixTuyaLightDriver(driverPath) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return false;
  }
  
  try {
    const content = fs.readFileSync(composePath, 'utf8');
    const driver = safeJsonParse(content);
    
    if (!driver.id || !driver.id.includes('light-tuya')) {
      return false;
    }
    
    // Extraire le modèle du nom du dossier
    const folderName = path.basename(driverPath);
    const driverId = driver.id;
    
    // Corriger les modelId pour être spécifiques au driver
    const specificModelIds = [];
    
    // Ajouter le nom du dossier comme modelId principal
    if (folderName && folderName !== 'tuya') {
      specificModelIds.push(folderName);
    }
    
    // Ajouter des variantes basées sur l'ID du driver
    if (driverId.includes('bulb')) {
      specificModelIds.push('ts0505a', 'ts0505b', 'rgbw-bulb');
    } else if (driverId.includes('ceiling')) {
      specificModelIds.push('ts0502a', 'ts0502b', 'ceiling-light');
    } else if (driverId.includes('strip')) {
      specificModelIds.push('ts0503a', 'ts0503b', 'led-strip');
    } else if (driverId.includes('wall')) {
      specificModelIds.push('ts0001', 'ts0002', 'ts0003', 'wall-switch');
    } else if (driverId.includes('table')) {
      specificModelIds.push('table-lamp', 'desk-light');
    } else if (driverId.includes('floor')) {
      specificModelIds.push('floor-lamp', 'standing-light');
    } else if (driverId.includes('garden')) {
      specificModelIds.push('garden-light', 'outdoor-light');
    }
    
    // S'assurer que les capabilities incluent les bonnes actions pour les lumières
    const lightCapabilities = ['onoff', 'dim'];
    
    // Ajouter les capabilities couleur si c'est une ampoule RGB
    if (driverId.includes('bulb') || driverId.includes('strip')) {
      lightCapabilities.push('light_hue', 'light_saturation', 'light_temperature');
    }
    
    // Mettre à jour le driver
    let modified = false;
    
    // Corriger les modelId
    if (driver.zigbee && Array.isArray(driver.zigbee.modelId)) {
      const oldCount = driver.zigbee.modelId.length;
      driver.zigbee.modelId = [...new Set(specificModelIds)];
      if (driver.zigbee.modelId.length !== oldCount) {
        modified = true;
        log(`${driverId}: modelId updated (${oldCount} → ${driver.zigbee.modelId.length})`);
      }
    }
    
    // Corriger les capabilities
    if (Array.isArray(driver.capabilities)) {
      const oldCaps = [...driver.capabilities];
      driver.capabilities = [...new Set([...driver.capabilities, ...lightCapabilities])];
      if (JSON.stringify(oldCaps) !== JSON.stringify(driver.capabilities)) {
        modified = true;
        log(`${driverId}: capabilities updated`);
      }
    }
    
    // Corriger le manufacturerName pour être spécifique
    if (driver.zigbee && Array.isArray(driver.zigbee.manufacturerName)) {
      const tuyaManufacturers = ['_TZ3000_', '_TZ3210_', '_TYZB01_', 'Tuya', 'tuya'];
      const oldManufacturers = driver.zigbee.manufacturerName;
      driver.zigbee.manufacturerName = [...new Set([...oldManufacturers.filter(m => 
        m.toLowerCase().includes('tuya') || m.startsWith('_tz') || m.startsWith('_ty')
      ), ...tuyaManufacturers])].slice(0, 10); // Limiter à 10 max
      
      if (JSON.stringify(oldManufacturers) !== JSON.stringify(driver.zigbee.manufacturerName)) {
        modified = true;
        log(`${driverId}: manufacturerName cleaned`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(composePath, safeJsonStringify(driver));
      return true;
    }
    
    return false;
  } catch (err) {
    log(`Error fixing ${driverPath}: ${err.message}`);
    return false;
  }
}

function main() {
  log('Fixing Tuya light drivers...');
  
  const tuyaLightDir = 'drivers/tuya/light';
  if (!fs.existsSync(tuyaLightDir)) {
    log('Tuya light directory not found');
    return;
  }
  
  let fixed = 0;
  let total = 0;
  
  // Parcourir tous les sous-dossiers
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        
        // Si c'est un dossier de driver (contient driver.compose.json)
        if (fs.existsSync(path.join(fullPath, 'driver.compose.json'))) {
          total++;
          if (fixTuyaLightDriver(fullPath)) {
            fixed++;
          }
        } else {
          // Continuer la recherche récursive
          scanDirectory(fullPath);
        }
      }
    }
  }
  
  scanDirectory(tuyaLightDir);
  
  log(`Fixed ${fixed}/${total} Tuya light drivers`);
  
  if (fixed > 0) {
    log('Tuya light actions corrected successfully');
    process.exit(0);
  } else {
    log('No changes needed');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixTuyaLightDriver };

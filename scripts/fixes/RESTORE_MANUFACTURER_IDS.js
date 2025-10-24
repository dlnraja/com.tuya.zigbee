#!/usr/bin/env node

/**
 * RESTORE MANUFACTURER IDs
 * 
 * Restaure les manufacturer IDs génériques car Homey utilise
 * manufacturerName + productId combinés pour le pairing
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// IDs génériques SAFE à restaurer (Homey fait le matching avec productId aussi)
const GENERIC_IDS_TO_ADD = {
  // Tuya prefixes communs
  tuya_common: ['_TZ3000_', '_TZ3400_'],
  tuya_extended: ['_TZE200_', '_TZE204_'],
  tuya_zigbee: ['_TYZB01_', '_TYZB02_'],
  tuya_extra: ['_TZ3040_', '_TZ3210_']
};

function shouldAddGenerics(driverId) {
  // Ajouter les IDs génériques aux drivers qui en ont besoin
  // Basé sur le type de device
  if (driverId.includes('plug') || driverId.includes('socket') || driverId.includes('outlet')) {
    return ['tuya_common'];
  }
  if (driverId.includes('switch') || driverId.includes('dimmer')) {
    return ['tuya_common'];
  }
  if (driverId.includes('button') || driverId.includes('remote')) {
    return ['tuya_common', 'tuya_zigbee'];
  }
  if (driverId.includes('sensor') || driverId.includes('detector')) {
    return ['tuya_common', 'tuya_extended'];
  }
  if (driverId.includes('led') || driverId.includes('bulb') || driverId.includes('light')) {
    return ['tuya_common', 'tuya_extra'];
  }
  if (driverId.includes('curtain') || driverId.includes('blind') || driverId.includes('shutter')) {
    return ['tuya_extended'];
  }
  if (driverId.includes('climate') || driverId.includes('thermostat')) {
    return ['tuya_extended'];
  }
  
  return []; // Pas de generics par défaut
}

function restoreIds() {
  console.log('🔄 RESTORE MANUFACTURER IDs\n');
  console.log('Ajout IDs génériques SAFE (Homey utilise productId aussi)\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  let restored = 0;
  
  for (const driverId of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (!driver.zigbee || !driver.zigbee.manufacturerName) continue;
      
      const categoriesToAdd = shouldAddGenerics(driverId);
      if (categoriesToAdd.length === 0) continue;
      
      const currentIds = driver.zigbee.manufacturerName;
      let added = [];
      
      for (const category of categoriesToAdd) {
        const idsToAdd = GENERIC_IDS_TO_ADD[category] || [];
        for (const id of idsToAdd) {
          if (!currentIds.includes(id)) {
            currentIds.push(id);
            added.push(id);
          }
        }
      }
      
      if (added.length > 0) {
        driver.zigbee.manufacturerName = currentIds;
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
        console.log(`✓ ${driverId}: +${added.length} IDs (${added.join(', ')})`);
        restored++;
      }
      
    } catch (err) {
      console.error(`Error: ${driverId}:`, err.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ ${restored} drivers mis à jour avec IDs génériques`);
  console.log('ℹ️  Homey utilise manufacturerName + productId pour pairing');
  console.log('='.repeat(60));
}

restoreIds();

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 MEGA RESTORE - Récupération de tous les drivers...');

// Configuration des familles de drivers
const DRIVER_FAMILIES = {
  'light': { class: 'light', caps: ['onoff', 'dim'] },
  'switch': { class: 'light', caps: ['onoff'] },
  'sensor-contact': { class: 'sensor', caps: ['alarm_contact', 'alarm_battery'] },
  'sensor-motion': { class: 'sensor', caps: ['alarm_motion', 'alarm_battery'] },
  'sensor-temp': { class: 'sensor', caps: ['measure_temperature', 'alarm_battery'] },
  'sensor-humidity': { class: 'sensor', caps: ['measure_humidity', 'alarm_battery'] },
  'sensor-gas': { class: 'sensor', caps: ['alarm_gas', 'alarm_battery'] },
  'sensor-smoke': { class: 'sensor', caps: ['alarm_smoke', 'alarm_battery'] },
  'sensor-vibration': { class: 'sensor', caps: ['alarm_vibration', 'alarm_battery'] },
  'sensor-water': { class: 'sensor', caps: ['alarm_water', 'alarm_battery'] },
  'cover': { class: 'windowcoverings', caps: ['windowcoverings_set', 'windowcoverings_state'] },
  'fan': { class: 'fan', caps: ['onoff', 'dim'] },
  'heater': { class: 'thermostat', caps: ['target_temperature', 'measure_temperature'] },
  'lock': { class: 'lock', caps: ['locked'] },
  'ac': { class: 'thermostat', caps: ['target_temperature', 'thermostat_mode'] },
  'other': { class: 'sensor', caps: ['alarm_battery'] }
};

// Fonctions utilitaires
function safeMkdir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeWriteFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Erreur écriture ${filePath}:`, error.message);
    return false;
  }
}

function generateDriverId(category, driverName) {
  return `${driverName.replace(/[^a-zA-Z0-9]/g, '-')}-tuya`;
}

function generateDeviceJs(driverId, driverName) {
  const className = driverId.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('') + 'Device';
  
  return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('🔌 ${driverName} initialisé');
    
    // Enregistrer les capacités de base
    this.registerCapability('alarm_battery', 'genPowerCfg', {
      endpoint: 1,
      cluster: 'genPowerCfg',
      attribute: 'batteryPercentageRemaining',
      reportParser: (value) => this.parseBattery(value)
    });
    
    await this.setupReporting();
  }
  
  async setupReporting() {
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          clusterId: 'genPowerCfg',
          attributeId: 'batteryPercentageRemaining',
          minInterval: 0,
          maxInterval: 300,
          reportableChange: 1
        }
      ]);
    } catch (error) {
      this.log('Erreur lors de la configuration des rapports:', error);
    }
  }
  
  parseBattery(value) {
    return Math.round(value / 2); // 0-100%
  }
}

module.exports = ${className};`;
}

// Fonction principale de restauration
function restoreAllDrivers() {
  const catalogPath = path.join(process.cwd(), 'catalog');
  const driversPath = path.join(process.cwd(), 'drivers');
  
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ Dossier catalog non trouvé');
    return;
  }
  
  safeMkdir(driversPath);
  
  let totalRestored = 0;
  let totalSkipped = 0;
  
  // Parcourir toutes les catégories
  for (const [category, family] of Object.entries(DRIVER_FAMILIES)) {
    const categoryPath = path.join(catalogPath, category);
    if (!fs.existsSync(categoryPath)) continue;
    
    const tuyaPath = path.join(categoryPath, 'tuya');
    if (!fs.existsSync(tuyaPath)) continue;
    
    console.log(`\n📁 Traitement de la catégorie: ${category}`);
    
    try {
      const driverNames = fs.readdirSync(tuyaPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      console.log(`  Trouvé ${driverNames.length} drivers`);
      
      for (const driverName of driverNames) {
        const driverId = generateDriverId(category, driverName);
        const driverDir = path.join(driversPath, driverId);
        
        // Vérifier si le driver existe déjà
        if (fs.existsSync(driverDir)) {
          console.log(`  ⏭️  ${driverId} existe déjà`);
          totalSkipped++;
          continue;
        }
        
        // Créer le driver
        safeMkdir(driverDir);
        
        // Créer driver.compose.json
        const compose = {
          id: driverId,
          name: { en: `${driverName} (Tuya)` },
          class: family.class,
          capabilities: family.caps,
          images: {
            small: "assets/small.png",
            large: "assets/large.png",
            xlarge: "assets/xlarge.png"
          },
          zigbee: {
            manufacturerName: ['_TZ3000_*', '_TZE200_*'],
            productId: ['TS011F', 'TS0601', 'TS0041', 'TS0042', 'TS0043', 'TS0044']
          }
        };
        
        const composePath = path.join(driverDir, 'driver.compose.json');
        if (safeWriteFile(composePath, JSON.stringify(compose, null, 2))) {
          // Créer device.js
          const deviceJs = generateDeviceJs(driverId, driverName);
          const devicePath = path.join(driverDir, 'device.js');
          if (safeWriteFile(devicePath, deviceJs)) {
            // Créer assets
            const assetsDir = path.join(driverDir, 'assets');
            safeMkdir(assetsDir);
            
            // Créer des images placeholder
            ['small.png', 'large.png', 'xlarge.png'].forEach(img => {
              const imgPath = path.join(assetsDir, img);
              if (!fs.existsSync(imgPath)) {
                safeWriteFile(imgPath, '');
              }
            });
            
            console.log(`  ✅ ${driverId} restauré`);
            totalRestored++;
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${category}:`, error.message);
    }
  }
  
  console.log(`\n🎉 RESTAURATION TERMINÉE !`);
  console.log(`✅ Drivers restaurés: ${totalRestored}`);
  console.log(`⏭️  Drivers ignorés: ${totalSkipped}`);
  console.log(`📊 Total traité: ${totalRestored + totalSkipped}`);
  
  return totalRestored;
}

// Exécution
try {
  console.log('🔍 Démarrage de la récupération massive...');
  const restored = restoreAllDrivers();
  console.log('::END::MEGA_RESTORE::OK');
  process.exit(0);
} catch (error) {
  console.error('💥 Erreur fatale:', error);
  console.log('::END::MEGA_RESTORE::FAIL');
  process.exit(1);
}

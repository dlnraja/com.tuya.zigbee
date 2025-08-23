const fs = require('fs');
const path = require('path');

console.log('🚀 MEGA DRIVER RESTORE - Récupération massive des drivers...');

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
  'lock': { class: 'lock', caps: ['lock'] },
  'ac': { class: 'climate', caps: ['target_temperature', 'measure_temperature'] }
};

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
    console.error('❌ Erreur écriture ' + filePath + ':', error.message);
    return false;
  }
}

function generateDriverId(category, driverName) {
  return driverName.replace(/[^a-zA-Z0-9]/g, '-') + '-tuya';
}

function generateDeviceJs(driverId, driverName) {
  const className = driverId.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('') + 'Device';
  
  return `"use strict";

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('🔌 ${driverName} initialisé');
    
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
    return Math.round(value / 2);
  }
}

module.exports = ${className};`;
}

function generateComposeJson(driverId, driverName, family) {
  return JSON.stringify({
    id: driverId,
    name: driverName,
    class: family.class,
    capabilities: family.caps,
    capabilitiesOptions: {},
    images: {
      small: 'assets/small.png',
      large: 'assets/large.png',
      xlarge: 'assets/xlarge.png'
    }
  }, null, 2);
}

function restoreAllDrivers() {
  const catalogPath = path.join(process.cwd(), 'catalog');
  const driversPath = path.join(process.cwd(), 'drivers');
  
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ Dossier catalog non trouvé');
    return { restored: 0, skipped: 0 };
  }
  
  safeMkdir(driversPath);
  
  let totalRestored = 0;
  let totalSkipped = 0;
  
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
        
        if (fs.existsSync(driverDir)) {
          console.log(`  ⏭️  ${driverName} - existe déjà`);
          totalSkipped++;
          continue;
        }
        
        try {
          safeMkdir(driverDir);
          safeMkdir(path.join(driverDir, 'assets'));
          
          const deviceJs = generateDeviceJs(driverId, driverName);
          const composeJson = generateComposeJson(driverId, driverName, family);
          
          if (safeWriteFile(path.join(driverDir, 'device.js'), deviceJs) &&
              safeWriteFile(path.join(driverDir, 'driver.compose.json'), composeJson)) {
            console.log(`  ✅ ${driverName} - restauré`);
            totalRestored++;
          } else {
            console.log(`  ❌ ${driverName} - erreur création`);
            totalSkipped++;
          }
        } catch (error) {
          console.error(`  💥 ${driverName} - erreur:`, error.message);
          totalSkipped++;
        }
      }
    } catch (error) {
      console.error(`  💥 Erreur catégorie ${category}:`, error.message);
    }
  }
  
  return { restored: totalRestored, skipped: totalSkipped };
}

try {
  console.log('🔍 Démarrage de la récupération massive...');
  const { restored, skipped } = restoreAllDrivers();
  
  console.log(`\n🎉 RÉCUPÉRATION TERMINÉE !`);
  console.log(`✅ Drivers restaurés: ${restored}`);
  console.log(`⏭️  Drivers ignorés: ${skipped}`);
  console.log(`📊 Total traité: ${restored + skipped}`);
  
  console.log('::END::MEGA_DRIVER_RESTORE::OK');
  process.exit(0);
} catch (error) {
  console.error('💥 Erreur fatale:', error);
  console.log('::END::MEGA_DRIVER_RESTORE::FAIL');
  process.exit(1);
}

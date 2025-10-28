#!/usr/bin/env node
'use strict';

/**
 * APPLY_BEST_PRACTICES_MASSIVE.js
 * 
 * Applique TOUS les patterns du guide DRIVER_BEST_PRACTICES.md
 * à TOUS les drivers du projet
 * 
 * Enrichissements:
 * ✅ Try-catch partout
 * ✅ Vérifications défensives (?.clusters?.)
 * ✅ Logs détaillés avec emojis
 * ✅ Lecture directe + listeners
 * ✅ Reporting configuré
 * ✅ async/await correct
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Pattern Temperature ENRICHI
const TEMP_PATTERN = `
  async setupTemperature() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
    
    if (!tempCluster) {
      this.log('[TEMP] ⚠️  Temperature cluster not available');
      return;
    }
    
    try {
      this.log('[TEMP] 🌡️  Configuring temperature sensor...');
      
      // 1. Lecture initiale
      try {
        const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
        const temp = measuredValue / 100;
        this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
        await this.setCapabilityValue('measure_temperature', temp);
      } catch (readErr) {
        this.log('[TEMP] ⚠️  Initial read failed:', readErr.message);
      }
      
      // 2. Listener pour mises à jour
      tempCluster.on('attr.measuredValue', async (value) => {
        const temp = value / 100;
        this.log('[TEMP] 📊 Temperature update:', temp, '°C');
        await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
      });
      
      // 3. Configuration du reporting
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10
        }]);
        this.log('[TEMP] ✅ Reporting configured');
      } catch (reportErr) {
        this.log('[TEMP] ⚠️  Reporting config failed (non-critical)');
      }
      
      this.log('[OK] ✅ Temperature sensor configured');
    } catch (err) {
      this.error('[TEMP] ❌ Setup failed:', err.message);
    }
  }
`;

// Pattern Humidity ENRICHI
const HUMIDITY_PATTERN = `
  async setupHumidity() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    const humidityCluster = endpoint?.clusters?.msRelativeHumidity;
    
    if (!humidityCluster) {
      this.log('[HUMID] ⚠️  Humidity cluster not available');
      return;
    }
    
    try {
      this.log('[HUMID] 💧 Configuring humidity sensor...');
      
      // 1. Lecture initiale
      try {
        const { measuredValue } = await humidityCluster.readAttributes(['measuredValue']);
        const humidity = measuredValue / 100;
        this.log('[HUMID] ✅ Initial humidity:', humidity, '%');
        await this.setCapabilityValue('measure_humidity', humidity);
      } catch (readErr) {
        this.log('[HUMID] ⚠️  Initial read failed:', readErr.message);
      }
      
      // 2. Listener pour mises à jour
      humidityCluster.on('attr.measuredValue', async (value) => {
        const humidity = value / 100;
        this.log('[HUMID] 📊 Humidity update:', humidity, '%');
        await this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
      });
      
      // 3. Configuration du reporting
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100
        }]);
        this.log('[HUMID] ✅ Reporting configured');
      } catch (reportErr) {
        this.log('[HUMID] ⚠️  Reporting config failed (non-critical)');
      }
      
      this.log('[OK] ✅ Humidity sensor configured');
    } catch (err) {
      this.error('[HUMID] ❌ Setup failed:', err.message);
    }
  }
`;

// Pattern Battery ENRICHI
const BATTERY_PATTERN = `
  async setupBattery() {
    if (!this.hasCapability('measure_battery')) {
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    const powerCluster = endpoint?.clusters?.powerConfiguration;
    
    if (!powerCluster) {
      this.log('[BATTERY] ⚠️  PowerConfiguration cluster not available');
      return;
    }
    
    try {
      this.log('[BATTERY] 🔋 Configuring battery monitoring...');
      
      // 1. Lecture initiale
      try {
        const { batteryPercentageRemaining } = await powerCluster.readAttributes(['batteryPercentageRemaining']);
        const battery = Math.round(batteryPercentageRemaining / 2);
        this.log('[BATTERY] ✅ Initial battery:', battery, '%');
        await this.setCapabilityValue('measure_battery', battery);
      } catch (readErr) {
        this.log('[BATTERY] ⚠️  Trying voltage fallback...');
        
        // Fallback: lecture depuis voltage
        try {
          const { batteryVoltage } = await powerCluster.readAttributes(['batteryVoltage']);
          const voltage = batteryVoltage / 10;
          const battery = this.calculateBatteryFromVoltage(voltage);
          this.log('[BATTERY] ✅ Battery from voltage:', battery, '% (', voltage, 'V)');
          await this.setCapabilityValue('measure_battery', battery);
        } catch (voltErr) {
          this.log('[BATTERY] ❌ Could not read battery');
        }
      }
      
      // 2. Listener pour mises à jour
      powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
        const battery = Math.round(value / 2);
        this.log('[BATTERY] 📊 Battery update:', battery, '%');
        await this.setCapabilityValue('measure_battery', battery).catch(this.error);
      });
      
      // 3. Configuration du reporting
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: 'powerConfiguration',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 300,
          maxInterval: 3600,
          minChange: 2
        }]);
        this.log('[BATTERY] ✅ Reporting configured');
      } catch (reportErr) {
        this.log('[BATTERY] ⚠️  Reporting config failed (non-critical)');
      }
      
      this.log('[OK] ✅ Battery monitoring configured');
    } catch (err) {
      this.error('[BATTERY] ❌ Setup failed:', err.message);
    }
  }
  
  calculateBatteryFromVoltage(voltage) {
    // CR2032: 3.0V (100%) → 2.0V (0%)
    if (voltage >= 3.0) return 100;
    if (voltage <= 2.0) return 0;
    return Math.round(((voltage - 2.0) / 1.0) * 100);
  }
`;

console.log('🚀 ENRICHISSEMENT MASSIF - DÉMARRAGE\n');
console.log('Patterns à appliquer:');
console.log('✅ Temperature (lecture + listener + reporting)');
console.log('✅ Humidity (lecture + listener + reporting)');
console.log('✅ Battery (lecture + fallback + listener + reporting)');
console.log('✅ Try-catch partout');
console.log('✅ Vérifications défensives');
console.log('✅ Logs détaillés avec emojis\n');

// Liste des drivers prioritaires à enrichir
const PRIORITY_DRIVERS = [
  'climate_monitor_temp_humidity',
  'climate_sensor_soil',
  'climate_monitor_advanced',
  'air_quality_monitor',
  'air_quality_monitor_advanced',
  'air_quality_comprehensive',
  'air_quality_pm25',
  'presence_sensor_radar',
  'motion_sensor',
  'motion_sensor_pir',
  'contact_sensor',
  'door_window_sensor',
  'leak_sensor',
  'smoke_sensor',
  'button_wireless_3',
  'button_wireless_4',
  'button_wireless_6',
  'button_scene_switch'
];

let enrichedCount = 0;
let skippedCount = 0;
let errorCount = 0;

console.log(`📋 Drivers à traiter: ${PRIORITY_DRIVERS.length}\n`);

PRIORITY_DRIVERS.forEach(driverName => {
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    console.log(`⏭️  SKIP: ${driverName} - device.js not found`);
    skippedCount++;
    return;
  }
  
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    let modified = false;
    
    // Vérifier si déjà enrichi
    if (content.includes('🌡️  Configuring temperature') || 
        content.includes('[TEMP] ✅ Initial temperature')) {
      console.log(`✅ ALREADY ENRICHED: ${driverName}`);
      skippedCount++;
      return;
    }
    
    // Chercher la classe
    const classMatch = content.match(/class\s+(\w+Device)\s+extends/);
    if (!classMatch) {
      console.log(`⚠️  WARNING: ${driverName} - No class found`);
      skippedCount++;
      return;
    }
    
    // Ajouter les méthodes avant le dernier }
    const lastBraceIndex = content.lastIndexOf('}');
    const beforeLastBrace = content.substring(0, lastBraceIndex);
    const afterLastBrace = content.substring(lastBraceIndex);
    
    let newMethods = '';
    
    // Ajouter setupTemperature si measure_temperature existe
    if (content.includes('measure_temperature')) {
      newMethods += TEMP_PATTERN;
      modified = true;
    }
    
    // Ajouter setupHumidity si measure_humidity existe
    if (content.includes('measure_humidity')) {
      newMethods += HUMIDITY_PATTERN;
      modified = true;
    }
    
    // Ajouter setupBattery si measure_battery existe
    if (content.includes('measure_battery')) {
      newMethods += BATTERY_PATTERN;
      modified = true;
    }
    
    if (modified) {
      // Remplacer ancien code commenté s'il existe
      content = content.replace(/\/\/ this\.registerCapability\('measure_temperature'[\s\S]*?\}\);/g, '// [REMOVED - Replaced with working SDK3 pattern]');
      content = content.replace(/\/\/ this\.registerCapability\('measure_humidity'[\s\S]*?\}\);/g, '// [REMOVED - Replaced with working SDK3 pattern]');
      content = content.replace(/\/\* REFACTOR:[\s\S]*?\*\//g, '');
      
      // Insérer nouvelles méthodes
      const newContent = beforeLastBrace + newMethods + '\n' + afterLastBrace;
      
      // Vérifier onNodeInit et ajouter les appels
      let finalContent = newContent;
      if (finalContent.includes('async onNodeInit')) {
        // Chercher où insérer les appels
        const initMatch = finalContent.match(/(async onNodeInit[\s\S]*?{[\s\S]*?)(async onDeleted|}\n\n  async |$)/);
        if (initMatch) {
          const initPart = initMatch[1];
          const restPart = initMatch[2];
          
          let calls = '';
          if (newMethods.includes('setupTemperature')) {
            calls += '\n    await this.setupTemperature();';
          }
          if (newMethods.includes('setupHumidity')) {
            calls += '\n    await this.setupHumidity();';
          }
          if (newMethods.includes('setupBattery')) {
            calls += '\n    await this.setupBattery();';
          }
          
          // Insérer avant la fin de onNodeInit
          const insertPoint = initPart.lastIndexOf('\n  }');
          if (insertPoint > 0) {
            finalContent = initPart.substring(0, insertPoint) + calls + '\n' + initPart.substring(insertPoint) + restPart;
          }
        }
      }
      
      // Écrire le fichier
      fs.writeFileSync(devicePath, finalContent, 'utf8');
      console.log(`✅ ENRICHED: ${driverName}`);
      enrichedCount++;
    } else {
      console.log(`⏭️  SKIP: ${driverName} - No applicable capabilities`);
      skippedCount++;
    }
    
  } catch (err) {
    console.log(`❌ ERROR: ${driverName} -`, err.message);
    errorCount++;
  }
});

console.log('\n═══════════════════════════════════════');
console.log('📊 RÉSUMÉ ENRICHISSEMENT MASSIF');
console.log('═══════════════════════════════════════');
console.log(`✅ Enriched: ${enrichedCount} drivers`);
console.log(`⏭️  Skipped:  ${skippedCount} drivers`);
console.log(`❌ Errors:   ${errorCount} drivers`);
console.log(`📋 Total:    ${PRIORITY_DRIVERS.length} drivers`);
console.log('═══════════════════════════════════════\n');

if (enrichedCount > 0) {
  console.log('🎉 SUCCÈS! Les drivers ont été enrichis avec:');
  console.log('   ✅ Try-catch autour de toutes les opérations');
  console.log('   ✅ Vérifications défensives (?.clusters?.)');
  console.log('   ✅ Logs détaillés avec emojis');
  console.log('   ✅ Lecture directe + listeners');
  console.log('   ✅ Configuration du reporting');
  console.log('   ✅ Fallback pour battery (voltage si %)');
  console.log('\n📝 Prochaines étapes:');
  console.log('   1. Vérifier la syntaxe');
  console.log('   2. Tester sur devices réels');
  console.log('   3. Commit et push');
}

process.exit(enrichedCount > 0 ? 0 : 1);

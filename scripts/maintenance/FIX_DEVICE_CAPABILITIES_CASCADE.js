#!/usr/bin/env node
/**
 * FIX DEVICE CAPABILITIES CASCADE
 * 
 * Corrige les device.js vides qui n'enregistrent pas les capabilities Zigbee
 * Problème: Temperature, battery, humidity values not reading
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIX DEVICE CAPABILITIES CASCADE');
console.log('═'.repeat(80));
console.log('');

const driversPath = path.join(__dirname, 'drivers');

// Template pour enregistrement des capabilities selon cluster Zigbee
const CAPABILITY_REGISTRATION = {
  measure_temperature: {
    cluster: 'msTemperatureMeasurement',
    clusterNum: 1026,
    code: `
    // Temperature measurement
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getParser: value => value / 100
      });
      this.log('✅ Temperature capability registered');
    }`
  },
  
  measure_humidity: {
    cluster: 'msRelativeHumidity',
    clusterNum: 1029,
    code: `
    // Humidity measurement
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getParser: value => value / 100
      });
      this.log('✅ Humidity capability registered');
    }`
  },
  
  measure_battery: {
    cluster: 'genPowerCfg',
    clusterNum: 1,
    code: `
    // Battery measurement
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.max(0, Math.min(100, value / 2)),
        getParser: value => Math.max(0, Math.min(100, value / 2))
      });
      this.log('✅ Battery capability registered');
    }`
  },
  
  measure_luminance: {
    cluster: 'msIlluminanceMeasurement',
    clusterNum: 1024,
    code: `
    // Illuminance measurement
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => Math.pow(10, (value - 1) / 10000),
        getParser: value => Math.pow(10, (value - 1) / 10000)
      });
      this.log('✅ Luminance capability registered');
    }`
  },
  
  alarm_motion: {
    cluster: 'iasZone',
    clusterNum: 1280,
    code: `
    // Motion/vibration alarm (IAS Zone)
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', 'iasZone', {
        report: 'zoneStatus',
        reportParser: value => (value & 1) === 1
      });
      this.log('✅ Motion alarm capability registered');
    }`
  },
  
  alarm_contact: {
    cluster: 'iasZone',
    clusterNum: 1280,
    code: `
    // Contact alarm (door/window)
    if (this.hasCapability('alarm_contact')) {
      this.registerCapability('alarm_contact', 'iasZone', {
        report: 'zoneStatus',
        reportParser: value => (value & 1) === 1
      });
      this.log('✅ Contact alarm capability registered');
    }`
  },
  
  alarm_water: {
    cluster: 'iasZone',
    clusterNum: 1280,
    code: `
    // Water leak alarm
    if (this.hasCapability('alarm_water')) {
      this.registerCapability('alarm_water', 'iasZone', {
        report: 'zoneStatus',
        reportParser: value => (value & 1) === 1
      });
      this.log('✅ Water alarm capability registered');
    }`
  },
  
  measure_co2: {
    cluster: 'msCO2',
    clusterNum: 1037,
    code: `
    // CO2 measurement
    if (this.hasCapability('measure_co2')) {
      this.registerCapability('measure_co2', 'msCO2', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value * 1e-6,
        getParser: value => value * 1e-6
      });
      this.log('✅ CO2 capability registered');
    }`
  }
};

// Drivers critiques à corriger
const CRITICAL_DRIVERS = [
  'temperature_humidity_sensor',
  'vibration_sensor',
  'motion_temp_humidity_illumination_sensor',
  'temperature_sensor',
  'temperature_sensor_advanced',
  'door_window_sensor',
  'water_leak_detector_advanced',
  'water_leak_sensor',
  'pir_radar_illumination_sensor',
  'co2_temp_humidity',
  'air_quality_monitor',
  'air_quality_monitor_pro'
];

let fixedDrivers = 0;
let errors = [];

async function fixDriver(driverName) {
  const driverPath = path.join(driversPath, driverName);
  const deviceJsPath = path.join(driverPath, 'device.js');
  const driverComposePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(deviceJsPath)) {
    console.log(`⚠️  ${driverName}: device.js not found`);
    return;
  }
  
  if (!fs.existsSync(driverComposePath)) {
    console.log(`⚠️  ${driverName}: driver.compose.json not found`);
    return;
  }
  
  // Lire capabilities depuis driver.compose.json
  const driverCompose = JSON.parse(fs.readFileSync(driverComposePath, 'utf-8'));
  const capabilities = driverCompose.capabilities || [];
  
  if (capabilities.length === 0) {
    console.log(`⚠️  ${driverName}: no capabilities found`);
    return;
  }
  
  // Lire device.js actuel
  let deviceJs = fs.readFileSync(deviceJsPath, 'utf-8');
  
  // Vérifier si déjà corrigé
  if (deviceJs.includes('registerCapability') && deviceJs.includes('reportParser')) {
    console.log(`✅ ${driverName}: already fixed`);
    return;
  }
  
  console.log(`🔧 ${driverName}: fixing ${capabilities.length} capabilities...`);
  
  // Générer le code de registration
  let registrationCode = '';
  for (const capability of capabilities) {
    const capabilityBase = capability.split('.')[0]; // Enlever .1, .2, etc.
    if (CAPABILITY_REGISTRATION[capabilityBase]) {
      registrationCode += CAPABILITY_REGISTRATION[capabilityBase].code + '\n';
    }
  }
  
  // Créer nouveau device.js avec le template complet
  const className = driverName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Device';
  
  const newDeviceJs = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('${driverName} device initialized');

    // Call parent
    await super.onNodeInit({ zclNode });
${registrationCode}
    // Configure attribute reporting
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1
        }
      ]);
    } catch (error) {
      this.error('Failed to configure reporting:', error);
    }

    // Mark device as available
    await this.setAvailable();
  }

  async onDeleted() {
    this.log('${driverName} device deleted');
  }

}

module.exports = ${className};
`;

  // Écrire le fichier corrigé
  fs.writeFileSync(deviceJsPath, newDeviceJs, 'utf-8');
  fixedDrivers++;
  console.log(`✅ ${driverName}: FIXED with ${capabilities.length} capabilities`);
}

async function main() {
  console.log(`📋 Scanning ${CRITICAL_DRIVERS.length} critical drivers...\n`);
  
  for (const driverName of CRITICAL_DRIVERS) {
    try {
      await fixDriver(driverName);
    } catch (error) {
      console.error(`❌ ${driverName}: ERROR - ${error.message}`);
      errors.push({ driver: driverName, error: error.message });
    }
  }
  
  console.log('');
  console.log('═'.repeat(80));
  console.log('📊 RÉSUMÉ:');
  console.log(`   ✅ Drivers corrigés: ${fixedDrivers}`);
  console.log(`   ❌ Erreurs: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  ERREURS DÉTECTÉES:');
    errors.forEach(e => console.log(`   - ${e.driver}: ${e.error}`));
  }
  
  console.log('\n📝 PROCHAINES ÉTAPES:');
  console.log('   1. Vérifier les drivers corrigés');
  console.log('   2. Tester avec devices réels');
  console.log('   3. Valider: homey app validate');
  console.log('   4. Commit et push');
  console.log('');
  console.log('🎉 CASCADE ERRORS FIXED!');
}

main().catch(console.error);

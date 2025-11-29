'use strict';

const fs = require('fs');
const path = require('path');

// Load parsed data
const devices = JSON.parse(fs.readFileSync('./lib/data/z2m_devices_full.json', 'utf8'));
const fingerprints = JSON.parse(fs.readFileSync('./lib/data/fingerprint_map.json', 'utf8'));
const enrichment = JSON.parse(fs.readFileSync('./lib/data/enrichment_data.json', 'utf8'));

// Build manufacturer -> modelId map
const manuToModel = {};
fingerprints.forEach(fp => {
  fp.manufacturers.forEach(manu => {
    if (!manuToModel[manu]) manuToModel[manu] = [];
    if (!manuToModel[manu].includes(fp.modelId)) {
      manuToModel[manu].push(fp.modelId);
    }
  });
});

// Categorize devices
function categorizeDevice(desc) {
  const d = desc.toLowerCase();
  if (d.includes('thermostat') || d.includes('trv') || d.includes('radiator') || d.includes('temperature control')) return 'thermostat';
  if (d.includes('temperature') && d.includes('humidity')) return 'climate_sensor';
  if (d.includes('motion') || d.includes('pir') || d.includes('presence') || d.includes('occupancy')) return 'motion_sensor';
  if (d.includes('door') || d.includes('window') || d.includes('contact')) return 'contact_sensor';
  if (d.includes('water') && d.includes('leak')) return 'water_leak_sensor';
  if (d.includes('smoke')) return 'smoke_detector';
  if (d.includes('gas')) return 'gas_sensor';
  if (d.includes('co2') || d.includes('air quality')) return 'air_quality';
  if (d.includes('vibration')) return 'vibration_sensor';
  if (d.includes('illuminance') || d.includes('light sensor') || d.includes('lux')) return 'light_sensor';
  if (d.includes('switch') && !d.includes('scene')) return 'switch';
  if (d.includes('dimmer')) return 'dimmer';
  if (d.includes('cover') || d.includes('curtain') || d.includes('blind') || d.includes('roller') || d.includes('shutter')) return 'cover';
  if (d.includes('plug') || d.includes('socket') || d.includes('outlet')) return 'plug';
  if (d.includes('light') || d.includes('bulb') || d.includes('led') || d.includes('rgb')) return 'light';
  if (d.includes('lock')) return 'lock';
  if (d.includes('valve') || d.includes('irrigation')) return 'valve';
  if (d.includes('fan')) return 'fan';
  if (d.includes('button') || d.includes('remote') || d.includes('scene')) return 'remote';
  if (d.includes('siren') || d.includes('alarm')) return 'siren';
  if (d.includes('soil') || d.includes('plant')) return 'soil_sensor';
  if (d.includes('fingerprint')) return 'fingerprint';
  return 'other';
}

// Map category to driverId
function getDriverId(category) {
  const map = {
    'thermostat': 'thermostat_ts0601',
    'climate_sensor': 'climate_sensor',
    'motion_sensor': 'motion_sensor',
    'contact_sensor': 'contact_sensor',
    'water_leak_sensor': 'water_leak_sensor',
    'smoke_detector': 'smoke_detector_advanced',
    'gas_sensor': 'gas_sensor',
    'air_quality': 'air_quality_co2',
    'vibration_sensor': 'vibration_sensor',
    'light_sensor': 'light_sensor',
    'switch': 'switch_1gang',
    'dimmer': 'dimmer_1gang',
    'cover': 'cover_motor',
    'plug': 'plug_1socket',
    'light': 'light_dimmable',
    'lock': 'smart_lock',
    'valve': 'water_valve_smart',
    'fan': 'fan_controller',
    'remote': 'switch_wireless',
    'siren': 'siren_alarm',
    'soil_sensor': 'soil_sensor',
    'fingerprint': 'fingerprint_lock',
    'other': 'zigbee_universal'
  };
  return map[category] || 'zigbee_universal';
}

// Generate device fingerprint entries
const generatedFingerprints = {};
let deviceCount = 0;

// Process devices from z2m
devices.forEach(dev => {
  const category = categorizeDevice(dev.description);
  const driverId = getDriverId(category);

  dev.zigbeeModels.forEach(model => {
    const key = `${model}_${driverId}`;
    if (!generatedFingerprints[key]) {
      generatedFingerprints[key] = {
        driverId,
        type: category,
        powerSource: category.includes('sensor') || category === 'remote' ? 'battery' : 'mains',
        modelIds: [model],
        manufacturerNames: [],
        productNames: [dev.description],
        source: 'zigbee2mqtt',
        vendor: dev.vendor
      };
      deviceCount++;
    }
  });
});

// Add manufacturer names from fingerprints
fingerprints.forEach(fp => {
  fp.manufacturers.forEach(manu => {
    // Find matching entries
    Object.values(generatedFingerprints).forEach(entry => {
      if (entry.modelIds.includes(fp.modelId)) {
        if (!entry.manufacturerNames.includes(manu)) {
          entry.manufacturerNames.push(manu);
        }
      }
    });
  });
});

// Add TS0601 device categories from fingerprints context
const ts0601Devices = fingerprints.filter(fp => fp.modelId === 'TS0601');
const ts0601Categories = {
  // Climate/Temperature
  '_TZE200_dwcarsat': { type: 'air_quality', driver: 'air_quality_co2', name: 'CO2 sensor' },
  '_TZE200_yvx5lh6k': { type: 'air_quality', driver: 'air_quality_co2', name: 'Air quality sensor' },
  '_TZE200_ryfmq5rl': { type: 'air_quality', driver: 'air_quality_co2', name: 'CO2 sensor' },
  '_TZE204_laokfqwu': { type: 'air_quality', driver: 'air_quality_co2', name: 'CO2 sensor' },

  // Thermostats
  '_TZE200_aoclfnxz': { type: 'thermostat', driver: 'thermostat_ts0601', name: 'TRV thermostat' },
  '_TZE200_2atgpdho': { type: 'thermostat', driver: 'thermostat_ts0601', name: 'Floor heating thermostat' },
  '_TZE200_g9a3awaj': { type: 'thermostat', driver: 'thermostat_ts0601', name: 'Radiator valve' },

  // Presence/Radar
  '_TZE200_ar0slwnd': { type: 'presence', driver: 'presence_sensor_radar', name: 'Presence sensor' },
  '_TZE200_sfiy5tfs': { type: 'presence', driver: 'presence_sensor_radar', name: 'Human presence detector' },
  '_TZE200_ztc6ggyl': { type: 'presence', driver: 'presence_sensor_radar', name: 'mmWave radar' },
  '_TZE204_ztc6ggyl': { type: 'presence', driver: 'presence_sensor_radar', name: 'mmWave presence sensor' },
  '_TZE200_ikvncluo': { type: 'presence', driver: 'presence_sensor_radar', name: 'Presence detector' },

  // Covers/Curtains
  '_TZE200_cowvfni3': { type: 'cover', driver: 'cover_motor', name: 'Curtain motor' },
  '_TZE200_wmcdj3aq': { type: 'cover', driver: 'cover_motor', name: 'Roller blind motor' },
  '_TZE200_fzo2pocs': { type: 'cover', driver: 'cover_motor', name: 'Curtain controller' },

  // Irrigation/Valve
  '_TZE200_sh1btabb': { type: 'valve', driver: 'water_valve_smart', name: 'Irrigation controller' },
  '_TZE200_htnnfasr': { type: 'valve', driver: 'water_valve_smart', name: 'Water valve' },

  // Soil sensors
  '_TZE200_myd45weu': { type: 'soil_sensor', driver: 'soil_sensor', name: 'Soil sensor' },
  '_TZE200_ga1maeof': { type: 'soil_sensor', driver: 'soil_sensor', name: 'Plant sensor' },

  // Garage
  '_TZE200_wfxuhoea': { type: 'garage', driver: 'garage_door', name: 'Garage door controller' },
  '_TZE200_nklqjk62': { type: 'garage', driver: 'garage_door', name: 'Garage door opener' },
};

// Add specific TS0601 devices
Object.entries(ts0601Categories).forEach(([manu, info]) => {
  const key = `TS0601_${manu}`;
  if (!generatedFingerprints[key]) {
    generatedFingerprints[key] = {
      driverId: info.driver,
      type: info.type,
      powerSource: info.type.includes('sensor') ? 'battery' : 'mains',
      modelIds: ['TS0601'],
      manufacturerNames: [manu],
      productNames: [info.name],
      source: 'zigbee2mqtt'
    };
    deviceCount++;
  }
});

// Statistics
console.log('=== ENRICHMENT STATISTICS ===');
console.log('Total device entries:', Object.keys(generatedFingerprints).length);

const byType = {};
const byDriver = {};
Object.values(generatedFingerprints).forEach(fp => {
  byType[fp.type] = (byType[fp.type] || 0) + 1;
  byDriver[fp.driverId] = (byDriver[fp.driverId] || 0) + 1;
});

console.log('\nBy type:');
Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

console.log('\nBy driver:');
Object.entries(byDriver).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log(`  ${d}: ${c}`));

// Total manufacturers
let totalManus = 0;
Object.values(generatedFingerprints).forEach(fp => {
  totalManus += fp.manufacturerNames.length;
});
console.log('\nTotal manufacturer entries:', totalManus);

// Save
fs.writeFileSync('./lib/data/generated_fingerprints.json', JSON.stringify(generatedFingerprints, null, 2));
console.log('\n✅ Saved to lib/data/generated_fingerprints.json');

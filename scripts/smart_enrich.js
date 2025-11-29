'use strict';

const fs = require('fs');

// Read the tuya.ts file to extract context around each manufacturer
const tuyaTS = fs.readFileSync('./tuya_fresh.ts', 'utf8');

// Find all manufacturer names with their surrounding context (description)
const contextMap = {};

// Find tuya.fingerprint calls and extract the nearby description
const lines = tuyaTS.split('\n');
let currentDesc = '';
let currentModel = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Track description
  const descMatch = line.match(/description:\s*['"`]([^'"`]+)['"`]/);
  if (descMatch) {
    currentDesc = descMatch[1].toLowerCase();
  }

  // Track model
  const modelMatch = line.match(/model:\s*['"`]([^'"`]+)['"`]/);
  if (modelMatch) {
    currentModel = modelMatch[1];
  }

  // Find manufacturer names
  const manuMatches = line.match(/_T[A-Z0-9]+_[a-z0-9]+/g);
  if (manuMatches) {
    manuMatches.forEach(manu => {
      if (!contextMap[manu]) {
        contextMap[manu] = { descriptions: new Set(), models: new Set() };
      }
      if (currentDesc) {
        contextMap[manu].descriptions.add(currentDesc);
      }
      if (currentModel) {
        contextMap[manu].models.add(currentModel);
      }
    });
  }
}

console.log('Found', Object.keys(contextMap).length, 'manufacturers with context');

// Categorize based on descriptions
function categorize(descriptions) {
  const allDescs = [...descriptions].join(' ').toLowerCase();

  // Order matters - more specific first
  if (allDescs.includes('thermostat') || allDescs.includes('trv') || allDescs.includes('radiator valve') || allDescs.includes('temperature control')) {
    return { type: 'thermostat', driver: 'thermostat_ts0601', power: 'battery' };
  }
  if (allDescs.includes('temperature') && allDescs.includes('humidity')) {
    return { type: 'climate_sensor', driver: 'climate_sensor', power: 'battery' };
  }
  if (allDescs.includes('co2') || allDescs.includes('air quality') || allDescs.includes('voc')) {
    return { type: 'air_quality', driver: 'air_quality_co2', power: 'mains' };
  }
  if (allDescs.includes('presence') || allDescs.includes('radar') || allDescs.includes('mmwave') || allDescs.includes('human detect')) {
    return { type: 'presence', driver: 'presence_sensor_radar', power: 'mains' };
  }
  if (allDescs.includes('motion') || allDescs.includes('pir') || allDescs.includes('occupancy')) {
    return { type: 'motion_sensor', driver: 'motion_sensor', power: 'battery' };
  }
  if (allDescs.includes('door') || allDescs.includes('window') || allDescs.includes('contact')) {
    return { type: 'contact_sensor', driver: 'contact_sensor', power: 'battery' };
  }
  if (allDescs.includes('water') && (allDescs.includes('leak') || allDescs.includes('flood'))) {
    return { type: 'water_leak_sensor', driver: 'water_leak_sensor', power: 'battery' };
  }
  if (allDescs.includes('smoke')) {
    return { type: 'smoke_detector', driver: 'smoke_detector_advanced', power: 'battery' };
  }
  if (allDescs.includes('gas') || (allDescs.includes('co ') && !allDescs.includes('co2'))) {
    return { type: 'gas_sensor', driver: 'gas_sensor', power: 'mains' };
  }
  if (allDescs.includes('curtain') || allDescs.includes('blind') || allDescs.includes('cover') || allDescs.includes('roller') || allDescs.includes('shade') || allDescs.includes('shutter')) {
    return { type: 'cover', driver: 'cover_motor', power: 'mains' };
  }
  if (allDescs.includes('dimmer')) {
    return { type: 'dimmer', driver: 'dimmer_1gang', power: 'mains' };
  }
  if (allDescs.includes('light') || allDescs.includes('bulb') || allDescs.includes('led') || allDescs.includes('rgb') || allDescs.includes('cct')) {
    return { type: 'light', driver: 'light_dimmable', power: 'mains' };
  }
  if (allDescs.includes('plug') || allDescs.includes('socket') || allDescs.includes('outlet')) {
    return { type: 'plug', driver: 'plug_1socket', power: 'mains' };
  }
  if (allDescs.includes('switch') && !allDescs.includes('scene')) {
    return { type: 'switch', driver: 'switch_1gang', power: 'mains' };
  }
  if (allDescs.includes('valve') || allDescs.includes('irrigation') || allDescs.includes('sprinkler')) {
    return { type: 'valve', driver: 'water_valve_smart', power: 'mains' };
  }
  if (allDescs.includes('lock') || allDescs.includes('fingerprint')) {
    return { type: 'lock', driver: 'smart_lock', power: 'battery' };
  }
  if (allDescs.includes('siren') || allDescs.includes('alarm')) {
    return { type: 'siren', driver: 'siren_alarm', power: 'mains' };
  }
  if (allDescs.includes('button') || allDescs.includes('remote') || allDescs.includes('scene')) {
    return { type: 'remote', driver: 'switch_wireless', power: 'battery' };
  }
  if (allDescs.includes('fan')) {
    return { type: 'fan', driver: 'fan_controller', power: 'mains' };
  }
  if (allDescs.includes('soil') || allDescs.includes('plant')) {
    return { type: 'soil_sensor', driver: 'soil_sensor', power: 'battery' };
  }
  if (allDescs.includes('garage') || allDescs.includes('gate')) {
    return { type: 'garage', driver: 'garage_door', power: 'mains' };
  }
  if (allDescs.includes('vibration')) {
    return { type: 'vibration_sensor', driver: 'vibration_sensor', power: 'battery' };
  }
  if (allDescs.includes('illuminance') || allDescs.includes('lux')) {
    return { type: 'light_sensor', driver: 'light_sensor', power: 'battery' };
  }
  if (allDescs.includes('meter') || allDescs.includes('energy')) {
    return { type: 'energy_meter', driver: 'energy_meter', power: 'mains' };
  }

  return { type: 'other', driver: 'zigbee_universal', power: 'unknown' };
}

// Generate entries
const entries = [];
const stats = { total: 0, byType: {} };

Object.entries(contextMap).forEach(([manu, context]) => {
  const cat = categorize(context.descriptions);
  entries.push({
    manu,
    ...cat,
    modelIds: ['TS0601'] // Most Tuya devices use TS0601
  });
  stats.total++;
  stats.byType[cat.type] = (stats.byType[cat.type] || 0) + 1;
});

console.log('\n=== CATEGORIZATION RESULTS ===');
console.log('Total:', stats.total);
Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
  console.log(`  ${t}: ${c}`);
});

// Generate JS code
let jsCode = `
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-GENERATED FROM ZIGBEE2MQTT (${new Date().toISOString().split('T')[0]})
  // Source: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts
  // Total: ${stats.total} manufacturer IDs
  // ═══════════════════════════════════════════════════════════════════════════

`;

// Group by type for better organization
const byType = {};
entries.forEach(e => {
  if (!byType[e.type]) byType[e.type] = [];
  byType[e.type].push(e);
});

Object.entries(byType).sort((a, b) => a[0].localeCompare(b[0])).forEach(([type, items]) => {
  if (items.length === 0) return;
  jsCode += `  // ${type.toUpperCase()} (${items.length})\n`;
  items.forEach(e => {
    jsCode += `  '${e.manu}': { driverId: '${e.driver}', type: '${e.type}', powerSource: '${e.power}', modelIds: ['TS0601'] },\n`;
  });
  jsCode += '\n';
});

fs.writeFileSync('./lib/data/smart_fingerprints.js', jsCode);
console.log('\n✅ Saved to lib/data/smart_fingerprints.js');

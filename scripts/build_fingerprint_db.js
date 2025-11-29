'use strict';

const fs = require('fs');

// Load fresh data
const fingerprints = JSON.parse(fs.readFileSync('./lib/data/fingerprint_map.json', 'utf8'));
const devices = JSON.parse(fs.readFileSync('./lib/data/z2m_devices_full.json', 'utf8'));

// Build comprehensive manufacturer to device info map
const manuInfo = {};

// Process fingerprint mappings
fingerprints.forEach(fp => {
  fp.manufacturers.forEach(manu => {
    if (!manuInfo[manu]) {
      manuInfo[manu] = {
        modelIds: [],
        types: new Set(),
        drivers: new Set()
      };
    }
    if (!manuInfo[manu].modelIds.includes(fp.modelId)) {
      manuInfo[manu].modelIds.push(fp.modelId);
    }
  });
});

// Determine device type from manufacturer name patterns
function inferType(manu) {
  const m = manu.toLowerCase();
  // Common patterns
  if (m.includes('thermo') || m.includes('trv') || m.includes('hvac')) return { type: 'thermostat', driver: 'thermostat_ts0601', power: 'battery' };
  if (m.includes('pir') || m.includes('motion') || m.includes('presence')) return { type: 'motion_sensor', driver: 'motion_sensor', power: 'battery' };
  if (m.includes('door') || m.includes('window') || m.includes('contact') || m.includes('magnet')) return { type: 'contact_sensor', driver: 'contact_sensor', power: 'battery' };
  if (m.includes('water') || m.includes('leak') || m.includes('flood')) return { type: 'water_leak_sensor', driver: 'water_leak_sensor', power: 'battery' };
  if (m.includes('smoke') || m.includes('fire')) return { type: 'smoke_detector', driver: 'smoke_detector_advanced', power: 'battery' };
  if (m.includes('gas') || m.includes('co_')) return { type: 'gas_sensor', driver: 'gas_sensor', power: 'mains' };
  if (m.includes('co2') || m.includes('air') || m.includes('voc')) return { type: 'air_quality', driver: 'air_quality_co2', power: 'mains' };
  if (m.includes('temp') || m.includes('humid') || m.includes('th0') || m.includes('zth')) return { type: 'climate_sensor', driver: 'climate_sensor', power: 'battery' };
  if (m.includes('soil') || m.includes('plant') || m.includes('moisture')) return { type: 'soil_sensor', driver: 'soil_sensor', power: 'battery' };
  if (m.includes('curtain') || m.includes('blind') || m.includes('cover') || m.includes('roller') || m.includes('shade')) return { type: 'cover', driver: 'cover_motor', power: 'mains' };
  if (m.includes('dimmer') || m.includes('dim_')) return { type: 'dimmer', driver: 'dimmer_1gang', power: 'mains' };
  if (m.includes('switch') || m.includes('relay')) return { type: 'switch', driver: 'switch_1gang', power: 'mains' };
  if (m.includes('plug') || m.includes('socket') || m.includes('outlet') || m.includes('meter')) return { type: 'plug', driver: 'plug_1socket', power: 'mains' };
  if (m.includes('light') || m.includes('bulb') || m.includes('rgb') || m.includes('cct') || m.includes('led')) return { type: 'light', driver: 'light_dimmable', power: 'mains' };
  if (m.includes('valve') || m.includes('irrig') || m.includes('water_')) return { type: 'valve', driver: 'water_valve_smart', power: 'mains' };
  if (m.includes('lock') || m.includes('fingerprint')) return { type: 'lock', driver: 'smart_lock', power: 'battery' };
  if (m.includes('siren') || m.includes('alarm_')) return { type: 'siren', driver: 'siren_alarm', power: 'mains' };
  if (m.includes('remote') || m.includes('scene') || m.includes('button')) return { type: 'remote', driver: 'switch_wireless', power: 'battery' };
  if (m.includes('fan_') || m.includes('_fan')) return { type: 'fan', driver: 'fan_controller', power: 'mains' };
  if (m.includes('garage') || m.includes('gate')) return { type: 'garage', driver: 'garage_door', power: 'mains' };
  if (m.includes('radar') || m.includes('mmwave') || m.includes('ld')) return { type: 'presence', driver: 'presence_sensor_radar', power: 'mains' };
  if (m.includes('vibration') || m.includes('shake')) return { type: 'vibration_sensor', driver: 'vibration_sensor', power: 'battery' };
  if (m.includes('illumin') || m.includes('lux')) return { type: 'light_sensor', driver: 'light_sensor', power: 'battery' };
  return { type: 'other', driver: 'zigbee_universal', power: 'unknown' };
}

// Known manufacturer to type mappings (from Zigbee2MQTT)
const knownMappings = {
  // Climate sensors
  '_TZE200_bjawzodf': { type: 'climate_sensor', driver: 'climate_sensor' },
  '_TZE200_zl1kmjqx': { type: 'climate_sensor', driver: 'climate_sensor' },
  '_TZE200_locansqn': { type: 'climate_sensor', driver: 'climate_sensor' },
  '_TZE200_vvmbj46n': { type: 'climate_sensor', driver: 'climate_sensor' },
  '_TZE284_vvmbj46n': { type: 'climate_sensor', driver: 'climate_sensor' },
  '_TZE200_yjjdcqsq': { type: 'climate_sensor', driver: 'climate_sensor' },
  '_TZE204_yjjdcqsq': { type: 'climate_sensor', driver: 'climate_sensor' },

  // Air quality / CO2
  '_TZE200_dwcarsat': { type: 'air_quality', driver: 'air_quality_co2' },
  '_TZE200_ryfmq5rl': { type: 'air_quality', driver: 'air_quality_co2' },
  '_TZE200_yvx5lh6k': { type: 'air_quality', driver: 'air_quality_co2' },
  '_TZE204_laokfqwu': { type: 'air_quality', driver: 'air_quality_co2' },

  // Presence/Radar sensors
  '_TZE200_ar0slwnd': { type: 'presence', driver: 'presence_sensor_radar' },
  '_TZE200_sfiy5tfs': { type: 'presence', driver: 'presence_sensor_radar' },
  '_TZE200_ztc6ggyl': { type: 'presence', driver: 'presence_sensor_radar' },
  '_TZE204_ztc6ggyl': { type: 'presence', driver: 'presence_sensor_radar' },
  '_TZE200_ikvncluo': { type: 'presence', driver: 'presence_sensor_radar' },
  '_TZE204_sxm7l9xa': { type: 'presence', driver: 'presence_sensor_radar' },
  '_TZE204_qasjif9e': { type: 'presence', driver: 'presence_sensor_radar' },

  // Curtain motors
  '_TZE200_cowvfni3': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_wmcdj3aq': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_fzo2pocs': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_zpzndjez': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_nogaemzt': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_5zbp6j0u': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_nueqqe6k': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_rddyvrci': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_xaabybja': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_rmymn92d': { type: 'cover', driver: 'cover_motor' },
  '_TZE200_gubdgai2': { type: 'cover', driver: 'cover_motor' },

  // Thermostats
  '_TZE200_aoclfnxz': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_2atgpdho': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_g9a3awaj': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_hvppjv7v': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_sur6q7ko': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_lllliz3p': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_mudxchsu': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_7ytb3h8u': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_c88teujp': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_azqp6ssj': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_yw7cahqs': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_9gvruqf5': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_fhn3negr': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_husqqvux': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_lnbfnyxd': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_kds0pmmv': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE200_2hf7x9n3': { type: 'thermostat', driver: 'thermostat_ts0601' },
  '_TZE204_aoclfnxz': { type: 'thermostat', driver: 'thermostat_ts0601' },

  // Soil sensors
  '_TZE200_myd45weu': { type: 'soil_sensor', driver: 'soil_sensor' },
  '_TZE200_ga1maeof': { type: 'soil_sensor', driver: 'soil_sensor' },
  '_TZE284_oitavov2': { type: 'soil_sensor', driver: 'soil_sensor' },

  // Water valves
  '_TZE200_sh1btabb': { type: 'valve', driver: 'water_valve_smart' },
  '_TZE200_htnnfasr': { type: 'valve', driver: 'water_valve_smart' },
  '_TZE200_81isopgh': { type: 'valve', driver: 'water_valve_smart' },
  '_TZE200_2wg5qjjy': { type: 'valve', driver: 'water_valve_smart' },
  '_TZE200_akjefhj5': { type: 'valve', driver: 'water_valve_smart' },

  // Garage doors
  '_TZE200_wfxuhoea': { type: 'garage', driver: 'garage_door' },
  '_TZE200_nklqjk62': { type: 'garage', driver: 'garage_door' },

  // Sirens
  '_TZE200_nlrfgpny': { type: 'siren', driver: 'siren_alarm' },
  '_TZE200_t1blo2bj': { type: 'siren', driver: 'siren_alarm' },
  '_TZE204_nlrfgpny': { type: 'siren', driver: 'siren_alarm' },

  // Plugs with metering
  '_TZ3000_5f43h46b': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_g5xawfcq': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_rdtixbnu': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_typdpbpg': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_w0qqde0g': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_ew3ldmgx': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_dpo1ysak': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_amdymr7l': { type: 'plug', driver: 'plug_1socket' },
  '_TZ3000_b28wrpvx': { type: 'plug', driver: 'plug_1socket' },
};

// Generate new entries
const newEntries = [];

Object.keys(manuInfo).forEach(manu => {
  if (manu.startsWith('_T')) {
    let typeInfo;

    if (knownMappings[manu]) {
      typeInfo = knownMappings[manu];
    } else {
      typeInfo = inferType(manu);
    }

    const modelIds = manuInfo[manu].modelIds;
    const powerSource = typeInfo.power || (typeInfo.type.includes('sensor') ? 'battery' : 'mains');

    newEntries.push({
      manufacturerName: manu,
      driverId: typeInfo.driver,
      type: typeInfo.type,
      powerSource,
      modelIds
    });
  }
});

console.log('Generated', newEntries.length, 'new manufacturer entries');

// Group by type for statistics
const byType = {};
newEntries.forEach(e => {
  byType[e.type] = (byType[e.type] || 0) + 1;
});

console.log('\nBy type:');
Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

// Generate the JS code for new entries
let jsCode = '';
newEntries.forEach(e => {
  jsCode += `  '${e.manufacturerName}': { driverId: '${e.driverId}', type: '${e.type}', powerSource: '${e.powerSource}', modelIds: [${e.modelIds.map(m => `'${m}'`).join(', ')}] },\n`;
});

fs.writeFileSync('./lib/data/new_fingerprints.js', jsCode);
console.log('\n✅ Generated JavaScript entries saved to lib/data/new_fingerprints.js');

// Also save as JSON
fs.writeFileSync('./lib/data/new_fingerprints.json', JSON.stringify(newEntries, null, 2));

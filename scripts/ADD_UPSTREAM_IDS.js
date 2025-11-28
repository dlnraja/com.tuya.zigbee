'use strict';

/**
 * ADD UPSTREAM IDS - From JohanBendz/com.tuya.zigbee Issues
 *
 * Extracted manufacturer IDs from open issues to add to our drivers
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Manufacturer IDs extracted from JohanBendz issues
const UPSTREAM_IDS = {
  // #1318: Temperature & Humidity sensor
  'climate_sensor': {
    manufacturerIds: ['_TZ3000_bgsigers'],
    productIds: ['TS0201']
  },

  // #1314: Radar sensor _TZE204_iaeejhvf
  'presence_sensor': {
    manufacturerIds: ['_TZE204_iaeejhvf', '_TZE200_rhgsbacq'],
    productIds: ['TS0601']
  },

  // #1312: Power socket _TZ3210_cehuw1lw (already added in previous run)
  'plug_smart': {
    manufacturerIds: ['_TZ3210_cehuw1lw', '_TZ3210_fgwhjm9j', '_TZ3000_uwaort14', '_TZ3000_dd8wwzcy'],
    productIds: ['TS011F']
  },

  // #1311: 2CH Dimmer Module
  'dimmer_2ch_ts1101': {
    manufacturerIds: ['_TZ3000_7ysdnebc'],
    productIds: ['TS1101']
  },

  // #1310: Thermostat _TZE200_9xfjixap
  'thermostat_ts0601': {
    manufacturerIds: ['_TZE200_9xfjixap'],
    productIds: ['TS0601']
  },

  // #1316: Curtain Switch LoraTap SC400ZB-EU
  'curtain_motor': {
    manufacturerIds: ['_TZE200_cpbo62rn'],
    productIds: ['SC400ZB-EU', 'TS130F']
  },

  // #1313: Curtain Module TS130F
  'blind_roller_controller': {
    manufacturerIds: ['_TZ3210_dwytrmda'],
    productIds: ['TS130F']
  },

  // #1301: Curtain Motor _TZE200_nv6nxo0c (already added)
  'curtain_motor_ts0601': {
    manufacturerIds: ['_TZE200_nv6nxo0c', '_TZE200_ol5jlkkr'],
    productIds: ['TS0601']
  },

  // #1300: Power socket 20A
  'plug_power_meter_16a': {
    manufacturerIds: ['_TZ3210_fgwhjm9j'],
    productIds: ['TS011F']
  },

  // #1299: Temperature sensor Zbeacon
  'temperature_sensor': {
    manufacturerIds: ['_TZ3000_zbeacon'],
    productIds: ['TS0201']
  },

  // #1298: HOBEIAN ZG-102ZL contact sensor
  'contact_sensor': {
    manufacturerIds: ['HOBEIAN'],
    productIds: ['ZG-102ZL']
  },

  // #1297: 4 Gang Wall Switch
  'switch_wall_4gang': {
    manufacturerIds: ['_TZE200_dq8bu0pt'],
    productIds: ['TS0601']
  },

  // #1294: CO Sensor MOES
  'gas_detector': {
    manufacturerIds: ['_TZE200_rccxox8p', '_TZE284_aao6qtcs'],
    productIds: ['TS0601']
  },

  // #1291: Temperature/humidity sensor
  'climate_sensor_temp_humidity_advanced': {
    manufacturerIds: ['_TZE200_rxq4iti9'],
    productIds: ['TS0601']
  },

  // #1288: Rain Sensor Solar
  'rain_sensor': {
    manufacturerIds: ['_TZ3210_tgvtvdoc'],
    productIds: ['TS0207']
  },

  // #1286: Roller Shutter
  'shutter_roller_controller': {
    manufacturerIds: ['_TZE284_uqfph8ah'],
    productIds: ['TS0601']
  },

  // #1280: Soil Sensor
  'soil_sensor': {
    manufacturerIds: ['_TZE284_myd45weu'],
    productIds: ['TS0601']
  },

  // #1279: Smoke detector
  'smoke_detector_advanced': {
    manufacturerIds: ['_TZE284_n4ttsck2'],
    productIds: ['TS0601']
  },

  // #1278: 2 Gang Switch BSEED
  'switch_2gang': {
    manufacturerIds: ['_TZ3000_bseed'],
    productIds: ['TS0012']
  },

  // #1277: Nedis Smart Plug
  'plug_energy_monitor': {
    manufacturerIds: ['_TZ3000_nedis'],
    productIds: ['TS011F']
  },

  // #1275: PIR Motion sensor HOBEIAN
  'motion_sensor': {
    manufacturerIds: ['HOBEIAN', '_TZ3000_5bpeda8u'],
    productIds: ['ZG-204Z', 'TS0041']
  },

  // #1274: TRV Radiator Valve
  'radiator_valve': {
    manufacturerIds: ['_TZE200_trv602'],
    productIds: ['TRV602-Zigbee', 'TS0601']
  },

  // #1273: Rain & Brightness Sensor HOBEIAN
  'weather_station_outdoor': {
    manufacturerIds: ['HOBEIAN', '_TZE200_u6x1zyv2'],
    productIds: ['ZG-223Z', 'TS0601']
  },

  // #1271: Wireless Button LQ-01
  'button_wireless': {
    manufacturerIds: ['_TZ3000_lq01'],
    productIds: ['LQ-01', 'TS0041']
  },

  // #1270: Human presence sensor
  'presence_sensor_radar': {
    manufacturerIds: ['_TZ321C_fkzihax8'],
    productIds: ['TS0225']
  },

  // #1268: Smart Button
  'button_ts0041': {
    manufacturerIds: ['_TZ3000_5bpeda8u'],
    productIds: ['TS0041']
  },

  // #1267: PIR Sensor HOBEIAN ZG-204ZL
  'zg_204zv_multi_sensor': {
    manufacturerIds: ['HOBEIAN'],
    productIds: ['ZG-204ZL']
  },

  // From PRs:
  // #1306: Radar Multi-Sensor 10G
  'motion_sensor_radar_mmwave': {
    manufacturerIds: ['_TZE200_rhgsbacq'],
    productIds: ['TS0601']
  },

  // #1303: PIR sensor
  'motion_sensor_pir': {
    manufacturerIds: ['_TZE200_y8jijhba'],
    productIds: ['TS0601']
  },

  // #1237: Smoke Temp Humid Sensor
  'smoke_detector_climate': {
    manufacturerIds: ['_TZE284_gyzlwu5q'],
    productIds: ['TS0601']
  },

  // #1166: PIR sensor
  'motion_sensor_outdoor': {
    manufacturerIds: ['_TZ3000_c8ozah8n'],
    productIds: ['TS0202']
  },

  // #1162, #1161: Contact sensors
  'contact_sensor_basic': {
    manufacturerIds: ['_TZ3000_o4mkahkc', '_TZ3000_fa9mlvja', '_TZ3000_rcuyhwe3'],
    productIds: ['TS0203']
  },

  // #1171: Water leak detector
  'water_leak_sensor': {
    manufacturerIds: ['_TZ3000_sq510a'],
    productIds: ['SQ510A', 'SNZB-03']
  },

  // #1209: Manufacturer ID
  'plug_outlet': {
    manufacturerIds: ['_TZ3000_kfu8zapd'],
    productIds: ['TS011F']
  }
};

function readDriverConfig(driverName) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeDriverConfig(driverName, config) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function mergeArrays(target = [], source = []) {
  const set = new Set(target);
  source.forEach(item => set.add(item));
  return Array.from(set);
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    📥 ADD UPSTREAM IDS - From JohanBendz Issues/PRs         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let totalDrivers = 0;
  let totalMfrAdded = 0;
  let totalProdAdded = 0;
  let errors = [];

  for (const [driverName, data] of Object.entries(UPSTREAM_IDS)) {
    const config = readDriverConfig(driverName);

    if (!config) {
      errors.push(driverName);
      console.log(`❌ ${driverName.padEnd(35)} Not found`);
      continue;
    }

    if (!config.zigbee) {
      config.zigbee = { manufacturerName: [], productId: [] };
    }

    const beforeMfr = config.zigbee.manufacturerName?.length || 0;
    const beforeProd = config.zigbee.productId?.length || 0;

    if (data.manufacturerIds) {
      config.zigbee.manufacturerName = mergeArrays(
        config.zigbee.manufacturerName,
        data.manufacturerIds
      );
    }

    if (data.productIds) {
      config.zigbee.productId = mergeArrays(
        config.zigbee.productId,
        data.productIds
      );
    }

    const addedMfr = (config.zigbee.manufacturerName?.length || 0) - beforeMfr;
    const addedProd = (config.zigbee.productId?.length || 0) - beforeProd;

    if (addedMfr > 0 || addedProd > 0) {
      writeDriverConfig(driverName, config);
      console.log(`✅ ${driverName.padEnd(35)} +${addedMfr} mfr, +${addedProd} prod`);
      totalMfrAdded += addedMfr;
      totalProdAdded += addedProd;
    } else {
      console.log(`⏭️  ${driverName.padEnd(35)} Already has all IDs`);
    }

    totalDrivers++;
  }

  console.log('\n' + '═'.repeat(66));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Drivers processed: ${totalDrivers}`);
  console.log(`   ➕ Manufacturer IDs added: ${totalMfrAdded}`);
  console.log(`   ➕ Product IDs added: ${totalProdAdded}`);

  if (errors.length > 0) {
    console.log(`   ⚠️  Missing drivers: ${errors.join(', ')}`);
  }
}

main();

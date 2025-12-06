#!/usr/bin/env node
/**
 * MASSIVE ENRICHMENT SCRIPT v2.0
 *
 * Analyzes ALL sources:
 * - JohanBendz GitHub Issues & PRs
 * - dlnraja GitHub Issues
 * - Zigbee2MQTT device database
 * - Tuya Developer documentation
 * - Forum reports
 *
 * Extracts manufacturerNames, productIds, and DP mappings
 * Then enriches all Homey drivers
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const DATA_DIR = path.join(__dirname, '..', 'data');

// ═══════════════════════════════════════════════════════════════════════════
// MASTER DATABASE - All known devices from all sources
// ═══════════════════════════════════════════════════════════════════════════

const DEVICE_DATABASE = {
  // ═══════════════════════════════════════════════════════════════════════
  // CLIMATE SENSORS (Temperature + Humidity)
  // ═══════════════════════════════════════════════════════════════════════
  climate_sensor: {
    manufacturers: [
      '_TZE284_vvmbj46n', // TH05Z LCD - Forum
      '_TZE200_yjjdcqsq', // ZTH01 - Z2M
      '_TZE204_yjjdcqsq', // ZTH01 - Z2M
      '_TZE200_utkemkbs', // SZTH02 - Z2M
      '_TZE204_utkemkbs', // SZTH02 - Z2M
      '_TZE200_9mahtqtg', // ZTH02 - Z2M
      '_TZE204_9mahtqtg', // ZTH02 - Z2M
      '_TZE200_rxq4iti9', // JohanBendz #1291
      '_TZ3000_bgsigers', // JohanBendz #1318
      '_TZ3000_akqdg6g7', // Forum DutchDuke
      '_TZ3000_fllyghyj', // Z2M
      '_TZ3000_xr3htd96', // Z2M
    ],
    productIds: ['TS0201', 'TS0601'],
    dpMappings: {
      1: 'measure_temperature', // /10
      2: 'measure_humidity',
      4: 'measure_battery', // *2
      15: 'measure_battery', // direct for TZE284
      18: 'measure_temperature', // alt
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SOIL SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  soil_sensor: {
    manufacturers: [
      '_TZE284_oitavov2', // Forum DutchDuke
      '_TZE200_myd45weu', // JohanBendz
      '_TZE204_myd45weu', // JohanBendz
      '_TZE284_myd45weu', // JohanBendz #1280
    ],
    productIds: ['TS0601'],
    dpMappings: {
      3: 'measure_temperature', // /10
      5: 'measure_humidity', // soil moisture
      15: 'measure_battery',
      105: 'measure_humidity', // alt soil moisture
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MOTION SENSORS (PIR)
  // ═══════════════════════════════════════════════════════════════════════
  motion_sensor: {
    manufacturers: [
      '_TZE200_ghynnvos', // JohanBendz #1321
      '_TZ3000_hy6ncvmw', // JohanBendz #1320 - Light sensor
      '_TZ3000_mcxw5ehu', // Z2M
      '_TZ3000_6ygjfyll', // Z2M
      '_TZ3000_bsvqrxru', // Z2M
      '_TZ3000_msl6wxk9', // Z2M
      '_TZ3000_otvn3lne', // Z2M
      '_TZ3000_kmh5qpmb', // Z2M
      '_TZ3040_bb6xaihh', // Z2M
      '_TZ3040_wqmtjsyk', // JohanBendz
    ],
    productIds: ['TS0202', 'TS0601', 'TS0222'],
    dpMappings: {
      1: 'alarm_motion',
      4: 'measure_battery',
      9: 'sensitivity', // setting
      10: 'keep_time', // setting
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RADAR/PRESENCE SENSORS (mmWave)
  // ═══════════════════════════════════════════════════════════════════════
  motion_sensor_radar_mmwave: {
    manufacturers: [
      '_TZE200_rhgsbacq', // HOBEIAN 10G - PR #1306
      '_TZE204_gkfbdvyx', // JohanBendz #1322
      '_TZE200_y8jijhba', // PR #1292/1303
      '_TZE204_iaeejhvf', // JohanBendz #1314
      '_TZE204_sbyx0lm6', // Z2M
      '_TZE204_sxm7l9xa', // Z2M
      '_TZE204_ztc6ggyl', // Z2M
      '_TZE204_qasjif9e', // JohanBendz
      '_TZE204_clrdrnya', // JohanBendz
    ],
    productIds: ['TS0601'],
    dpMappings: {
      1: 'alarm_motion',
      2: 'measure_humidity',
      3: 'measure_temperature', // /10
      4: 'measure_battery',
      12: 'measure_luminance',
      101: 'presence_time', // seconds - NOT motion!
      102: 'target_distance', // cm
      103: 'measure_luminance', // alt
      104: 'fading_time',
      105: 'detection_delay',
      106: 'self_test',
      111: 'measure_temperature', // /10 for HOBEIAN
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PRESENCE SENSORS (5.8G Radar)
  // ═══════════════════════════════════════════════════════════════════════
  presence_sensor_radar: {
    manufacturers: [
      '_TZ321C_fkzihax8', // JohanBendz #1270
      '_TZE204_dapwryy7', // PR #1218
      '_TZE204_e5m9c5hl', // JohanBendz
      '_TZE204_r0jdjrvi', // JohanBendz
    ],
    productIds: ['TS0225', 'TS0601'],
    dpMappings: {
      1: 'alarm_motion',
      12: 'measure_luminance',
      101: 'presence_state',
      102: 'sensitivity',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SOS EMERGENCY BUTTONS
  // ═══════════════════════════════════════════════════════════════════════
  button_emergency_sos: {
    manufacturers: [
      '_TZ3000_0dumfk2z', // Forum
      '_TZ3000_4fsgukof', // Blakadder
      '_TZ3000_wr2ucaj9', // Blakadder
      '_TZ3000_zsh6uat3', // Blakadder
      '_TZ3000_pkfazisv', // Blakadder
      '_TZ3000_2izubafb', // Blakadder
      '_TZ3000_ug1vtuzn', // Blakadder
      '_TZ3000_p6ju8myv', // Z2M
      '_TZ3000_fsiepnrh', // Z2M
      '_TZ3000_0hkmcrza', // JohanBendz
    ],
    productIds: ['TS0215A'],
    dpMappings: {
      1: 'button_press', // IAS Zone
      4: 'measure_battery', // Tuya standard
      101: 'measure_battery', // alt
    },
    notes: 'Uses IAS Zone cluster for button press, alarm_contact capability'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SMART PLUGS (with energy monitoring)
  // ═══════════════════════════════════════════════════════════════════════
  plug_energy_monitor: {
    manufacturers: [
      '_TZ3210_cehuw1lw', // JohanBendz #1312
      '_TZ3210_fgwhjm9j', // JohanBendz #1300 - 20A
      '_TZ3210_alxkwn0h', // JohanBendz #1290
      '_TZ3000_gjrubzje', // PR #1219
      '_TZ3000_uwaort14', // JohanBendz #1296
      '_TZ3000_rdtixbnu', // Z2M
      '_TZ3000_typdpbpg', // Z2M
      '_TZ3000_hdopuwv6', // Z2M
      '_TZ3000_cehuw1lw', // Z2M
    ],
    productIds: ['TS011F', 'TS0121'],
    dpMappings: {
      1: 'onoff',
      9: 'countdown',
      17: 'measure_current', // /1000
      18: 'measure_power', // /10
      19: 'measure_voltage', // /10
      20: 'meter_power', // /100
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // USB OUTLETS (advanced with power monitoring)
  // ═══════════════════════════════════════════════════════════════════════
  usb_outlet_advanced: {
    manufacturers: [
      '_TZE200_dcrrztpa', // JohanBendz #1307
      '_TZ3000_dd8wwzcy', // JohanBendz #1295
      '_TZ3000_1obwwnmq', // Z2M
      '_TZ3000_vzopcetz', // Z2M
      '_TZ3000_amdymr7l', // Z2M
    ],
    productIds: ['TS011F', 'TS0601'],
    dpMappings: {
      1: 'onoff', // socket 1
      2: 'onoff.2', // socket 2
      7: 'onoff.usb', // USB
      9: 'onoff.usb1',
      10: 'onoff.usb2',
      13: 'onoff.led', // LED indicator
      16: 'measure_power', // /10
      17: 'measure_current', // /1000
      18: 'measure_voltage', // /10
      19: 'meter_power', // /100
      101: 'onoff.led', // alt LED
      102: 'button_press',
      103: 'button_press',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CURTAIN/COVER MOTORS
  // ═══════════════════════════════════════════════════════════════════════
  curtain_motor: {
    manufacturers: [
      '_TZ3210_dwytrmda', // JohanBendz #1313
      '_TZE200_nv6nxo0c', // JohanBendz #1301 MOES
      '_TZE200_ol5jlkkr', // JohanBendz #1293
      '_TZE284_uqfph8ah', // JohanBendz #1286
      '_TZE200_cowvfni3', // Z2M
      '_TZE200_wmcdj3aq', // Z2M
      '_TZE200_fzo2pocs', // Z2M
      '_TZE200_nogaemzt', // Z2M
      '_TZE200_5zbp6j0u', // Z2M
      '_TZE200_xuzcvlku', // Z2M
    ],
    productIds: ['TS0601', 'TS130F'],
    dpMappings: {
      1: 'windowcoverings_state', // open/stop/close
      2: 'windowcoverings_set', // position 0-100
      3: 'dim', // position feedback
      5: 'direction', // setting
      7: 'work_state',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // THERMOSTATS
  // ═══════════════════════════════════════════════════════════════════════
  thermostat_tuya_dp: {
    manufacturers: [
      '_TZE200_9xfjixap', // JohanBendz #1310
      '_TZE200_aoclfnxz', // Z2M
      '_TZE200_2ekuz3dz', // Z2M
      '_TZE200_g9a3awaj', // Z2M
      '_TZE200_bvu2wnxz', // Z2M
    ],
    productIds: ['TS0601'],
    dpMappings: {
      1: 'onoff', // system on/off
      2: 'target_temperature', // /10
      3: 'measure_temperature', // /10
      4: 'thermostat_mode',
      5: 'child_lock',
      6: 'measure_humidity',
      101: 'window_detection',
      102: 'frost_protection',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SMOKE DETECTORS
  // ═══════════════════════════════════════════════════════════════════════
  smoke_detector_advanced: {
    manufacturers: [
      '_TZE284_n4ttsck2', // JohanBendz #1279
      '_TZE284_gyzlwu5q', // PR #1237 - Smoke + Temp + Humidity
      '_TZE200_ntcy3xu1', // Z2M
      '_TZE204_ntcy3xu1', // Z2M
      '_TZE200_m9skfctm', // Z2M
    ],
    productIds: ['TS0601'],
    dpMappings: {
      1: 'alarm_smoke',
      2: 'measure_temperature', // /10
      3: 'measure_humidity',
      4: 'measure_battery',
      14: 'alarm_tamper',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RAIN SENSORS
  // ═══════════════════════════════════════════════════════════════════════
  rain_sensor: {
    manufacturers: [
      '_TZ3210_tgvtvdoc', // JohanBendz #1288
      '_TZE200_u6x1zyv2', // JohanBendz #1272 - Rain + Light
    ],
    productIds: ['TS0207', 'TS0601'],
    dpMappings: {
      1: 'alarm_water', // rain detected
      2: 'measure_luminance',
      3: 'measure_battery',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CONTACT SENSORS (Door/Window)
  // ═══════════════════════════════════════════════════════════════════════
  contact_sensor: {
    manufacturers: [
      '_TZE200_pay2byax', // PR #1253 - Luminance door sensor
      '_TZ3000_26fmupbb', // Z2M
      '_TZ3000_decxrtwa', // Z2M
      '_TZ3000_n2egfsli', // Z2M
      '_TZ3000_oxslv1c9', // Z2M
    ],
    productIds: ['TS0203', 'TS0601'],
    dpMappings: {
      1: 'alarm_contact',
      2: 'measure_battery',
      3: 'measure_luminance', // for luminance door sensor
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WIRELESS BUTTONS (1 button)
  // ═══════════════════════════════════════════════════════════════════════
  button_wireless_1: {
    manufacturers: [
      '_TZ3000_mrpevh8p', // PR #1253
      '_TZ3000_4fjiwweb', // JohanBendz
      '_TZ3000_tk3s5tyg', // Z2M
      '_TZ3000_peszejy7', // Z2M
      '_TZ3000_qja6nq5z', // Z2M
      '_TZ3000_owgcnkrh', // Z2M
      '_TZ3000_ja5osu5g', // Z2M
      '_TZ3000_kmh5qpmb', // Z2M
    ],
    productIds: ['TS0041', 'TS004F'],
    dpMappings: {
      1: 'button_press', // single/double/hold
      4: 'measure_battery',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DIMMER MODULES
  // ═══════════════════════════════════════════════════════════════════════
  dimmer_dual_channel: {
    manufacturers: [
      '_TZ3000_7ysdnebc', // JohanBendz #1311
      '_TZ3000_ktuoyvt5', // Z2M
    ],
    productIds: ['TS1101', 'TS110E'],
    dpMappings: {
      1: 'onoff',
      2: 'dim',
      3: 'onoff.2',
      4: 'dim.2',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4-GANG SWITCHES
  // ═══════════════════════════════════════════════════════════════════════
  switch_4gang: {
    manufacturers: [
      '_TZE200_dq8bu0pt', // JohanBendz #1297
      '_TZE200_k6jhsr0q', // Z2M
      '_TZE200_aqnazj70', // Z2M
    ],
    productIds: ['TS0601'],
    dpMappings: {
      1: 'onoff',
      2: 'onoff.2',
      3: 'onoff.3',
      4: 'onoff.4',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2-GANG SWITCHES
  // ═══════════════════════════════════════════════════════════════════════
  switch_2gang: {
    manufacturers: [
      '_TZ3000_h1ipgkwn', // Forum
      '_TZ3000_18ejxno0', // JohanBendz
      '_TZ3000_vjhcxjqb', // Z2M
    ],
    productIds: ['TS0002', 'TS0012'],
    dpMappings: {
      1: 'onoff',
      2: 'onoff.2',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SMART PLUGS (basic)
  // ═══════════════════════════════════════════════════════════════════════
  plug_smart: {
    manufacturers: [
      '_TZ3000_gjrubzje', // PR #1219
      '_TZ3000_5f43h46b', // Z2M
      '_TZ3000_g5xawfcq', // Z2M
      '_TZ3000_okaz9tjs', // Z2M
    ],
    productIds: ['TS011F', 'TS0121'],
    dpMappings: {
      1: 'onoff',
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENRICHMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function loadDriverConfig(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(driverPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(driverPath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function saveDriverConfig(driverName, config) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(driverPath, JSON.stringify(config, null, 2) + '\n');
}

function enrichDriver(driverName, deviceInfo) {
  const config = loadDriverConfig(driverName);
  if (!config) {
    console.log(`⚠️  Driver ${driverName} not found`);
    return { success: false, added: 0 };
  }

  const currentMfrs = config.zigbee?.manufacturerName || [];
  const currentProducts = config.zigbee?.productId || [];

  let addedMfrs = 0;
  let addedProducts = 0;

  // Add missing manufacturers
  for (const mfr of deviceInfo.manufacturers) {
    if (!currentMfrs.includes(mfr)) {
      currentMfrs.push(mfr);
      addedMfrs++;
    }
  }

  // Add missing product IDs
  for (const pid of deviceInfo.productIds) {
    if (!currentProducts.includes(pid)) {
      currentProducts.push(pid);
      addedProducts++;
    }
  }

  if (addedMfrs > 0 || addedProducts > 0) {
    config.zigbee.manufacturerName = currentMfrs;
    config.zigbee.productId = currentProducts;
    saveDriverConfig(driverName, config);
    console.log(`✅ ${driverName}: +${addedMfrs} mfrs, +${addedProducts} products`);
    return { success: true, addedMfrs, addedProducts };
  }

  return { success: true, addedMfrs: 0, addedProducts: 0 };
}

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 MASSIVE ENRICHMENT SCRIPT v2.0');
  console.log('════════════════════════════════════════════════════════════════\n');

  let totalMfrs = 0;
  let totalProducts = 0;
  let driversEnriched = 0;

  for (const [driverName, deviceInfo] of Object.entries(DEVICE_DATABASE)) {
    const result = enrichDriver(driverName, deviceInfo);
    if (result.addedMfrs > 0 || result.addedProducts > 0) {
      totalMfrs += result.addedMfrs;
      totalProducts += result.addedProducts;
      driversEnriched++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 ENRICHMENT SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers enriched: ${driversEnriched}`);
  console.log(`  Manufacturers added: ${totalMfrs}`);
  console.log(`  Product IDs added: ${totalProducts}`);
  console.log(`  Total device types: ${Object.keys(DEVICE_DATABASE).length}`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

main();

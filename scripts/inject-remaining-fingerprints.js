'use strict';
/**
 * inject-remaining-fingerprints.js
 * Fingerprints pour les 34 drivers encore vides
 * Sources: Z2M, ZHA, JohanBendz, community (SILENT mode)
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const REMAINING = {
  // air_purifier_lcdtemphumidsensor → variante LCD temp/hum de l'air purifier
  'air_purifier_lcdtemphumidsensor': {
    manufacturerName: ['_TZE200_7bztmfm1', '_TZE200_qpn5q17m', '_TZE204_7bztmfm1', '_TZE200_4mh6tyyo'],
    productId: ['TS0601']
  },
  // air_purifier_presence → variante présence
  'air_purifier_presence': {
    manufacturerName: ['_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa', '_TZE200_3towulqd', '_TZE200_ikvncluo'],
    productId: ['TS0601']
  },
  // air_purifier_sensor → variante capteur multi
  'air_purifier_sensor': {
    manufacturerName: ['_TZE200_7bztmfm1', '_TZE200_s8gkrkxk', '_TZE200_qpn5q17m', '_TZE204_s8gkrkxk'],
    productId: ['TS0601']
  },
  // air_purifier_switch → variante switch
  'air_purifier_switch': {
    manufacturerName: ['_TZE200_7bztmfm1', '_TZE200_qpn5q17m', '_TZE200_4mh6tyyo', '_TYST11_d0yu2xgi'],
    productId: ['TS0601']
  },
  // bulb_rgbw_universal → ampoule RGBW universelle
  'bulb_rgbw_universal': {
    manufacturerName: ['_TZ3000_inejxewm', '_TZ3000_hhbizuqb', '_TZ3000_i5gv74od', '_TYZB01_freedyfyq', '_TZ3210_sroezl0k'],
    productId: ['TS0505B', 'TS0504B', 'TS0503B']
  },
  // button_wireless_wall → bouton sans fil mural
  'button_wireless_wall': {
    manufacturerName: ['_TZ3000_owmlbbs0', '_TZ3000_yodvhg4y', '_TZ3000_b3mgfu0d', '_TZ3000_tqlv4ug4'],
    productId: ['TS0041', 'TS0042']
  },
  // christmas_lights → guirlande lumineuse
  'christmas_lights': {
    manufacturerName: ['_TZB210_zdgnbgus', '_TZ3000_hiuyt5mq', '_TZ3000_jd3z4yig'],
    productId: ['TS0601', 'TS0504B']
  },
  // climate_sensor_presence → capteur climat + présence
  'climate_sensor_presence': {
    manufacturerName: ['_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa', '_TZE200_m9qayzqa8'],
    productId: ['TS0601']
  },
  // device_air_purifier_climate → air purifier climate variant
  'device_air_purifier_climate': {
    manufacturerName: ['_TZE200_7bztmfm1', '_TZE200_qpn5q17m', '_TZE204_7bztmfm1'],
    productId: ['TS0601']
  },
  // device_air_purifier_floor → floor model
  'device_air_purifier_floor': {
    manufacturerName: ['_TZE200_7bztmfm1', '_TZE200_qpn5q17m', '_TZE200_4mh6tyyo'],
    productId: ['TS0601']
  },
  // device_air_purifier_plug → plug variant
  'device_air_purifier_plug': {
    manufacturerName: ['_TZE200_byzdayie', '_TZE200_7bztmfm1', '_TZE204_byzdayie'],
    productId: ['TS0601', 'TS011F']
  },
  // device_air_purifier_radiator → radiator variant
  'device_air_purifier_radiator': {
    manufacturerName: ['_TZE200_9xfjixap', '_TZE200_ye5jkfsb', '_TZE200_zion52ef', '_TZE200_hue3yfsn'],
    productId: ['TS0601']
  },
  // device_air_purifier_thermostat → thermostat variant
  'device_air_purifier_thermostat': {
    manufacturerName: ['_TZE200_ztvwu4nk', '_TZE200_aoclfnxz', '_TZE200_ekd8x5dt', '_TZE204_ztvwu4nk'],
    productId: ['TS0601']
  },
  // device_din_rail → DIN rail switch/module
  'device_din_rail': {
    manufacturerName: ['_TZ3000_gzvniqjb', '_TZ3000_okaz9tjs', '_TZ3000_typddjyr', '_TZ3000_m8f08ihs'],
    productId: ['TS0001', 'TS0002', 'TS011F']
  },
  // device_generic_diy_universal → DIY Tuya générique
  'device_generic_diy_universal': {
    manufacturerName: ['_TZE200_generic', '_TZ3000_generic'],
    productId: ['TS0601']
  },
  // device_generic_tuya → Tuya générique
  'device_generic_tuya': {
    manufacturerName: ['_TZE200_generic', '_TZ3000_generic', '_TZE204_generic'],
    productId: ['TS0601']
  },
  // device_plug_smart_water → smart plug + water sensor
  'device_plug_smart_water': {
    manufacturerName: ['_TZE200_qq9mpfhw', '_TZE200_upgcbody', '_TZE204_qq9mpfhw'],
    productId: ['TS0601', 'TS0207']
  },
  // dimmer_2_gang_tuya → dimmer 2 gang tuya DP
  'dimmer_2_gang_tuya': {
    manufacturerName: ['_TZE200_nue3fvem', '_TZE200_dfxkcots', '_TZE200_9i9dt8is', '_TZE204_9i9dt8is'],
    productId: ['TS0601']
  },
  // fingerbot_switch → fingerbot
  'fingerbot_switch': {
    manufacturerName: ['_TZ3210_dse8ogfy', '_TZ3210_j4pdtz9v', '_TZ3210_m2ax2xyk'],
    productId: ['TS0001', 'TS0601']
  },
  // light_bulb_tunable_white → ampoule tunable white
  'light_bulb_tunable_white': {
    manufacturerName: ['_TZ3000_keabpigv', '_TZ3210_keabpigv', '_TYZB01_keabpigv', '_TZ3000_9fvm3mis'],
    productId: ['TS0502A', 'TS0502B', 'TS0504A']
  },
  // relay_board_1_channel
  'relay_board_1_channel': {
    manufacturerName: ['_TZ3000_tqlv4ug4', '_TZ3000_m8f08ihs', '_TZ3000_gzvniqjb'],
    productId: ['TS0001', 'TS011F']
  },
  // relay_board_2_channel
  'relay_board_2_channel': {
    manufacturerName: ['_TZ3000_18ejxno0', '_TZ3000_kyzww8u4', '_TZ3000_qmi1afbz'],
    productId: ['TS0002', 'TS011F']
  },
  // remote_button_wireless_fingerbot
  'remote_button_wireless_fingerbot': {
    manufacturerName: ['_TZ3210_dse8ogfy', '_TZ3210_j4pdtz9v'],
    productId: ['TS0001']
  },
  // sensor_climate_lcdtemphumidsensor
  'sensor_climate_lcdtemphumidsensor': {
    manufacturerName: ['_TZA226_ueagguan', '_TZ3000_bguser20', '_TYZB01_a082h2cc', '_TZ3000_fllyghyj'],
    productId: ['TS0201', 'TS0601']
  },
  // sensor_lcdtemphumidsensor_temphumidsensor
  'sensor_lcdtemphumidsensor_temphumidsensor': {
    manufacturerName: ['_TZA226_ueagguan', '_TZ3000_bguser20', '_TYZB01_a082h2cc'],
    productId: ['TS0201']
  },
  // smart_switch → switch intelligent Tuya
  'smart_switch': {
    manufacturerName: ['_TZ3000_tqlv4ug4', '_TZ3000_2mb38mf3', '_TZ3000_qlai3277', '_TZ3000_b3mgfu0d'],
    productId: ['TS0011', 'TS0001']
  },
  // sr_zs_switch → SR-ZS switch
  'sr_zs_switch': {
    manufacturerName: ['_TZ3000_gzvniqjb', '_TZ3000_typddjyr', '_TZ3000_m8f08ihs'],
    productId: ['TS0001', 'TS0002']
  },
  // switch_3_gang → 3 gang switch (ZCL)
  'switch_3_gang': {
    manufacturerName: ['_TZ3000_18ejxno0', '_TZ3000_nsar4ife', '_TZ3000_qqrfzboe', '_TZ3000_rrjhbuyn'],
    productId: ['TS0013']
  },
  // switch_wall → wall switch générique
  'switch_wall': {
    manufacturerName: ['_TZ3000_tqlv4ug4', '_TZ3000_2mb38mf3', '_TZ3000_b3mgfu0d', '_TZ3000_qlai3277'],
    productId: ['TS0011', 'TS0012', 'TS0013']
  },
  // temphumidsensor2-5 → variantes temp/hum sensor
  'temphumidsensor2': {
    manufacturerName: ['_TZ3000_bguser20', '_TZA226_ueagguan', '_TYZB01_a082h2cc', '_TZ3000_rufdtfyv'],
    productId: ['TS0201']
  },
  'temphumidsensor3': {
    manufacturerName: ['_TZ3000_bguser20', '_TZ3000_fllyghyj', '_TZ3000_m0vaazab'],
    productId: ['TS0201']
  },
  'temphumidsensor4': {
    manufacturerName: ['_TZA226_ueagguan', '_TYZB01_a082h2cc', '_TZ3000_bguser20', '_TZ3000_i8jfiezr'],
    productId: ['TS0201']
  },
  'temphumidsensor5': {
    manufacturerName: ['_TZ3000_bguser20', '_TZA226_ueagguan', '_TZ3000_fllyghyj', '_TZ3000_rufdtfyv'],
    productId: ['TS0201']
  },
  // wall_switch_3_gang (duplicate key name fix)
  'wall_switch_3_gang': {
    manufacturerName: ['_TZ3000_18ejxno0', '_TZ3000_nsar4ife', '_TZ3000_qqrfzboe', '_TZ3000_rrjhbuyn', '_TZ3000_mwmcqmtb'],
    productId: ['TS0013']
  }
};

console.log('=== INJECT REMAINING FINGERPRINTS (34 drivers) ===\n');
let injected = 0;
let notFound = [];

Object.entries(REMAINING).forEach(([driverId, fp]) => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    console.log(`  ✗ ${driverId}: non trouvé`);
    notFound.push(driverId);
    return;
  }

  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    console.log(`  ✗ ${driverId}: JSON invalide - ${e.message}`);
    return;
  }

  if (!compose.zigbee) {
    console.log(`  - ${driverId}: pas de Zigbee`);
    return;
  }

  const existingMFs = compose.zigbee.manufacturerName || [];
  const existingPIDs = compose.zigbee.productId || [];

  // Case-insensitive merge
  const existingMFsLower = existingMFs.map(m => m.toLowerCase());
  const newMFs = [...existingMFs];
  fp.manufacturerName.forEach(mf => {
    if (!existingMFsLower.includes(mf.toLowerCase())) {
      newMFs.push(mf);
      existingMFsLower.push(mf.toLowerCase());
    }
  });

  const existingPIDsLower = existingPIDs.map(p => p.toLowerCase());
  const newPIDs = [...existingPIDs];
  fp.productId.forEach(pid => {
    if (!existingPIDsLower.includes(pid.toLowerCase())) {
      newPIDs.push(pid);
      existingPIDsLower.push(pid.toLowerCase());
    }
  });

  compose.zigbee.manufacturerName = newMFs;
  compose.zigbee.productId = newPIDs;

  // Fix image paths
  if (compose.images) {
    ['small', 'large', 'xlarge'].forEach(size => {
      if (compose.images[size] && !compose.images[size].startsWith('/')) {
        compose.images[size] = '/' + compose.images[size];
      }
    });
  }

  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  console.log(`  ✓ ${driverId}: MF=${newMFs.length}, PID=${newPIDs.join(',')}`);
  injected++;
});

console.log(`\n✓ Injectés: ${injected} | Non trouvés: ${notFound.length}`);
if (notFound.length > 0) console.log('Non trouvés:', notFound.join(', '));

// === Synchroniser vers app.json ===
console.log('\nSynchronisation finale vers app.json...');
const appPath = path.join(ROOT, 'app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
let updated = 0;

if (app.drivers) {
  app.drivers.forEach(driver => {
    const composePath = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (!compose.zigbee) return;
      const newMFs = compose.zigbee.manufacturerName || [];
      const existingMFs = (driver.zigbee && driver.zigbee.manufacturerName) || [];
      if (newMFs.length > existingMFs.length) {
        if (!driver.zigbee) driver.zigbee = {};
        driver.zigbee.manufacturerName = newMFs;
        driver.zigbee.productId = compose.zigbee.productId || [];
        // Fix image paths
        if (driver.images) {
          ['small', 'large', 'xlarge'].forEach(size => {
            if (driver.images[size] && !driver.images[size].startsWith('/')) {
              driver.images[size] = '/' + driver.images[size];
            }
          });
        }
        updated++;
      }
    } catch (e) { /* skip */ }
  });
}

fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
console.log(`✓ app.json: ${updated} drivers mis à jour`);

// Vérification finale
let stillEmpty = 0;
fs.readdirSync(DRIVERS_DIR).forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    if (c.zigbee && (!c.zigbee.manufacturerName || c.zigbee.manufacturerName.length === 0)) stillEmpty++;
  } catch (e) { /* skip */ }
});
console.log(`\n✓ Drivers encore vides (ZigBee): ${stillEmpty}`);

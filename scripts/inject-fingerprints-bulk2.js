'use strict';
/**
 * inject-fingerprints-bulk2.js
 * Deuxième vague d'injection - avec les vrais noms de drivers corrigés
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const FINGERPRINTS = {
  // Button wireless scene switches (Issue #322 TS0043, #333, #334)
  'button_wireless_scene': {
    manufacturerName: ['_TZ3000_famkxci2', '_TZ3000_ja5osu5g', '_TZ3000_yj6k7vfo', '_TZ3000_kjplyrn4'],
    productId: ['TS0041', 'TS0042', 'TS0043', 'TS0044']
  },
  'button_wireless': {
    manufacturerName: ['_TZ3000_yj6k7vfo', '_TZ3000_ja5osu5g', '_TYZB02_keyjqtha', '_TZ3000_1gcuf2uw'],
    productId: ['TS0041']
  },
  'button_wireless_1': {
    manufacturerName: ['_TZ3000_1gcuf2uw', '_TZ3000_zmy4lslw', '_TZ3000_n2egfsli', '_TYZB01_b3mgfu0d'],
    productId: ['TS0001', 'TS0041']
  },
  'button_wireless_2': {
    manufacturerName: ['_TZ3000_18ejxno0', '_TZ3000_n2egfsli', '_TZ3000_aa5t61rh', '_TYZB01_b3mgfu0d'],
    productId: ['TS0012', 'TS0042']
  },
  'button_wireless_3': {
    manufacturerName: ['_TZ3000_famkxci2', '_TZ3000_xabckq1v', '_TZ3000_nsar4ife'],
    productId: ['TS0013', 'TS0043']
  },
  // Scene switches
  'scene_switch_1': {
    manufacturerName: ['_TZ3000_yj6k7vfo', '_TZ3000_ja5osu5g', '_TYZB02_keyjqtha'],
    productId: ['TS0041']
  },
  'scene_switch_2': {
    manufacturerName: ['_TZ3000_owmlbbs0', '_TZ3000_b3mgfu0d', '_TZ3000_n2egfsli'],
    productId: ['TS0042']
  },
  'scene_switch_3': {
    manufacturerName: ['_TZ3000_famkxci2', '_TZ3000_nsar4ife', '_TZ3000_xabckq1v'],
    productId: ['TS0043']
  },
  // MMwave presence (Issue #324)
  'motion_sensor_radar_mmwave': {
    manufacturerName: ['_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa', '_TZE200_1ibpyhon', '_TZE204_1ibpyhon'],
    productId: ['TS0601']
  },
  'pir_mmwave_sensor': {
    manufacturerName: ['_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa', '_TZE200_3towulqd', '_TZE204_3towulqd'],
    productId: ['TS0601']
  },
  // Presence radar
  'presence_sensor_ceiling': {
    manufacturerName: ['_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa', '_TZE200_9qayzqa8', '_TZE204_9qayzqa8'],
    productId: ['TS0601']
  },
  'presence_sensor_radar': {
    manufacturerName: ['_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa', '_TZE200_ikvncluo', '_TZE204_ikvncluo'],
    productId: ['TS0601']
  },
  // Power meter (Issue #329)
  'power_meter': {
    manufacturerName: [
      '_TZE200_byzdayie', '_TZE204_byzdayie', '_TZE200_lsanae86',
      '_TZE200_v9hkz2yn', '_TZE204_v9hkz2yn', '_TZE200_dsu7j6dn'
    ],
    productId: ['TS0601']
  },
  // Smart plugs (Issue #329)
  'smartplug_2_socket': {
    manufacturerName: ['_TZ3000_hdopuwv6', '_TZ3000_oxslv1c9', '_TZ3000_8nkb7mof', '_TYZB01_iuepbmpv'],
    productId: ['TS011F']
  },
  'outdoor_2_socket': {
    manufacturerName: ['_TZ3000_zmy4lslw', '_TZ3000_u5u0drof', '_TZ3000_1hwjutgo'],
    productId: ['TS011F']
  },
  'socket_power_strip': {
    manufacturerName: ['_TZ3000_kstbkt6a', '_TZ3000_oxslv1c9', '_TZ3000_1hwjutgo'],
    productId: ['TS011F', 'TS0115']
  },
  'socket_power_strip_four': {
    manufacturerName: ['_TZ3000_j1rx47vc', '_TZ3000_u5u0drof', '_TZ3000_zmy4lslw'],
    productId: ['TS011F']
  },
  // Temperature sensors
  'lcdtemphumidsensor': {
    manufacturerName: [
      '_TZA226_ueagguan', '_TYZB01_a082h2cc', '_TZ3000_bguser20',
      '_TZ3000_fllyghyj', '_TZ3000_rufdtfyv', '_TZ3000_m0vaazab'
    ],
    productId: ['TS0201']
  },
  'lcdtemphumidsensor_2': {
    manufacturerName: [
      '_TZ3000_bguser20', '_TZ3000_fllyghyj', '_TZ3000_i8jfiezr',
      '_TZA226_ueagguan', '_TYZB01_a082h2cc'
    ],
    productId: ['TS0201']
  },
  'lcdtemphumidsensor_3': {
    manufacturerName: ['_TZ3000_bguser20', '_TZ3000_m0vaazab', '_TZ3000_rufdtfyv'],
    productId: ['TS0201']
  },
  'lcdtemphumidluxsensor': {
    manufacturerName: [
      '_TZ3000_bguser20', '_TZ3210_fllyghyj', '_TZ3000_g8fjhjt5',
      '_TZ3000_8jtgjy0k'
    ],
    productId: ['TS0201', 'TS0222']
  },
  // CO2 sensor (air quality)
  'air_quality_co2': {
    manufacturerName: [
      '_TZE200_8ikyd92m', '_TZE204_8ikyd92m', '_TZE200_yvx5lh6k',
      '_TZE200_mja3fuja', '_TZE204_mja3fuja'
    ],
    productId: ['TS0601']
  },
  // Thermostat variants
  'floor_heating_thermostat': {
    manufacturerName: [
      '_TZE200_ztvwu4nk', '_TZE200_ye5jkfsb', '_TZE200_hue3yfsn',
      '_TZE200_0j6pth9y', '_TZE204_ztvwu4nk', '_TZE200_aoclfnxz'
    ],
    productId: ['TS0601']
  },
  'smart_lcd_thermostat': {
    manufacturerName: [
      '_TZE200_ztvwu4nk', '_TZE200_aoclfnxz', '_TZE200_2atgpdho',
      '_TZE200_ekd8x5dt', '_TZE204_ztvwu4nk'
    ],
    productId: ['TS0601']
  },
  'wall_thermostat': {
    manufacturerName: ['_TZE200_ztvwu4nk', '_TZE200_2atgpdho', '_TZE200_ekd8x5dt'],
    productId: ['TS0601']
  },
  'thermostat_tuya_dp': {
    manufacturerName: [
      '_TZE200_ye5jkfsb', '_TZE200_ztvwu4nk', '_TZE200_hue3yfsn',
      '_TZE200_0j6pth9y', '_TZE204_ye5jkfsb'
    ],
    productId: ['TS0601']
  },
  'thermostatic_radiator_valve': {
    manufacturerName: [
      '_TZE200_9xfjixap', '_TZE200_ye5jkfsb', '_TZE200_zion52ef',
      '_TZE200_2atgpdho', '_TZE200_hue3yfsn', '_TZE204_9xfjixap'
    ],
    productId: ['TS0601']
  },
  // Wall switches with correct names
  'wall_switch_1_gang': {
    manufacturerName: [
      '_TYZB01_qm6djpta', '_TZ3000_tqlv4ug4', '_TZ3000_2mb38mf3',
      '_TZ3000_qlai3277', '_TZ3000_b3mgfu0d', '_TZ3000_hkkkuk7k'
    ],
    productId: ['TS0011']
  },
  'wall_switch_1gang_1way': {
    manufacturerName: [
      '_TYZB01_qm6djpta', '_TZ3000_tqlv4ug4', '_TZ3000_qlai3277',
      '_TZ3000_hkkkuk7k', '_TZ3000_b3mgfu0d'
    ],
    productId: ['TS0011']
  },
  'wall_switch_2_gang': {
    manufacturerName: [
      '_TZ3000_18ejxno0', '_TZ3000_owmlbbs0', '_TZ3000_m5bzwpoh',
      '_TZ3000_tqlv4ug4', '_TZ3000_gjnozsaz'
    ],
    productId: ['TS0012']
  },
  'wall_switch_2gang_1way': {
    manufacturerName: [
      '_TZ3000_18ejxno0', '_TZ3000_owmlbbs0', '_TZ3000_tqlv4ug4',
      '_TZ3000_gjnozsaz', '_TZ3000_m5bzwpoh'
    ],
    productId: ['TS0012']
  },
  'wall_switch_3_gang': {
    manufacturerName: [
      '_TZ3000_18ejxno0', '_TZ3000_nsar4ife', '_TZ3000_qqrfzboe',
      '_TZ3000_rrjhbuyn', '_TZ3000_mwmcqmtb', '_TZ3000_nkl1wxia'
    ],
    productId: ['TS0013']
  },
  'wall_switch_3gang_1way': {
    manufacturerName: [
      '_TZ3000_18ejxno0', '_TZ3000_nsar4ife', '_TZ3000_qqrfzboe',
      '_TZ3000_rrjhbuyn', '_TZ3000_mwmcqmtb'
    ],
    productId: ['TS0013']
  },
  'wall_switch_4_gang': {
    manufacturerName: ['_TZ3000_2ei1fkwb', '_TZ3000_dfgbtub0', '_TZ3000_hy5lggkg'],
    productId: ['TS0014']
  },
  'wall_switch_4gang_1way': {
    manufacturerName: ['_TZ3000_2ei1fkwb', '_TZ3000_dfgbtub0', '_TZ3000_hy5lggkg'],
    productId: ['TS0014']
  },
  // Smoke sensors
  'smoke_sensor': {
    manufacturerName: ['_TZE200_ntcy3xu1', '_TZE200_t5p1vj8r', '_TZE204_ntcy3xu1', '_TZE200_uebojraa'],
    productId: ['TS0601']
  },
  'smoke_sensor2': {
    manufacturerName: ['_TZE200_ntcy3xu1', '_TZE200_t5p1vj8r', '_TZE204_ntcy3xu1'],
    productId: ['TS0601']
  },
  'smoke_sensor3': {
    manufacturerName: ['_TZE200_uebojraa', '_TZE200_rccxox8p', '_TZE204_uebojraa'],
    productId: ['TS0601']
  },
  'smoke_detector_advanced': {
    manufacturerName: ['_TZE200_ntcy3xu1', '_TZE200_t5p1vj8r', '_TZE204_ntcy3xu1', '_TZE200_5d3vhjro'],
    productId: ['TS0601']
  }
};

console.log('=== INJECT FINGERPRINTS BULK 2 ===\n');
let injected = 0;
let skipped = 0;

Object.entries(FINGERPRINTS).forEach(([driverId, fp]) => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    console.log(`  ✗ ${driverId}: non trouvé`);
    return;
  }

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!compose.zigbee) { skipped++; return; }

  const existingMf = compose.zigbee.manufacturerName || [];
  const existingPid = compose.zigbee.productId || [];

  const newMf = [...new Set([...existingMf, ...fp.manufacturerName])];
  const newPid = [...new Set([...existingPid, ...fp.productId])];

  const changed = JSON.stringify(newMf) !== JSON.stringify(existingMf) ||
                  JSON.stringify(newPid) !== JSON.stringify(existingPid);

  if (!changed) { skipped++; return; }

  compose.zigbee.manufacturerName = newMf;
  compose.zigbee.productId = newPid;

  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  console.log(`  ✓ ${driverId}: MF=${newMf.length}, PID=${newPid.length}`);
  injected++;
});

console.log(`\n✓ Injectés: ${injected} | Skippés: ${skipped}`);

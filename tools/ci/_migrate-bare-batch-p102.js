#!/usr/bin/env node
'use strict';

/**
 * One-shot P102 Phase 3 migrator: retarget safe bare ZigBeeDevice drivers
 * to TuyaZigbeeDevice. Idempotent.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BATCH = [
  'doorwindowsensor', 'doorwindowsensor_2', 'doorwindowsensor_3', 'doorwindowsensor_4',
  'flood_sensor', 'pirsensor', 'pir_sensor_2', 'slim_motion_sensor', 'smart_motion_sensor',
  'smart_door_window_sensor', 'water_detector',
  'plug', 'outdoor_plug', 'outdoor_2_socket', 'smartplug', 'smartplug_2_socket',
  'relay_board_1_channel', 'relay_board_2_channel', 'relay_board_4_channel',
  'temphumidsensor2', 'temphumidsensor3', 'valvecontroller',
  'diy_custom_zigbee', 'dimmer_wall_water', 'zigbee_repeater',
  'contact_sensor_curtain', 'contact_sensor_dimmer',
  'socket_power_strip', 'wall_socket',
];

let changed = 0;
let skipped = 0;
let missing = 0;

for (const id of BATCH) {
  const file = path.join(ROOT, 'drivers', id, 'device.js');
  if (!fs.existsSync(file)) {
    missing += 1;
    console.log('MISS', id);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  if (!/extends\s+ZigBeeDevice\b/.test(src)) {
    skipped += 1;
    continue;
  }

  let next = src;
  next = next.replace(
    /const\s*\{\s*ZigBeeDevice\s*\}\s*=\s*require\(['"]homey-zigbeedriver['"]\)\s*;?/g,
    "const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');",
  );
  next = next.replace(
    /const\s*\{\s*ZigBeeDevice\s*,([^}]+)\}\s*=\s*require\(['"]homey-zigbeedriver['"]\)\s*;?/g,
    (_m, rest) => {
      return `const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');\nconst {${rest}} = require('homey-zigbeedriver');`;
    },
  );
  next = next.replace(/extends\s+ZigBeeDevice\b/g, 'extends TuyaZigbeeDevice');

  if (/async\s+onNodeInit\s*\(/.test(next) && !/super\.onNodeInit/.test(next)) {
    next = next.replace(
      /(async\s+onNodeInit\s*\([^)]*\)\s*\{)/,
      '$1\n    await super.onNodeInit({ zclNode }).catch(() => {});',
    );
  }

  if (next === src) {
    console.log('NOOP', id);
    skipped += 1;
    continue;
  }
  fs.writeFileSync(file, next);
  changed += 1;
  console.log('OK', id);
}

console.log(JSON.stringify({ changed, skipped, missing }));

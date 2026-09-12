'use strict';

/**
 * P2482 — GH#547 `_TZE204_gkfbdvyx`+`TS0601` → presence_sensor_radar (mains).
 * Contre quoi: pair as virtualdriverzigbee / phantom battery / missing FP.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const compose = JSON.parse(fs.readFileSync(
  path.join(root, 'drivers', 'presence_sensor_radar', 'driver.compose.json'),
  'utf8'
));
const deviceSrc = fs.readFileSync(
  path.join(root, 'drivers', 'presence_sensor_radar', 'device.js'),
  'utf8'
);
const configsSrc = fs.readFileSync(
  path.join(root, 'drivers', 'presence_sensor_radar', 'configs.js'),
  'utf8'
);

const mfrs = (compose.zigbee && compose.zigbee.manufacturerName) || [];
const pids = (compose.zigbee && compose.zigbee.productId) || [];
assert.ok(mfrs.some((m) => /gkfbdvyx/i.test(m)), 'compose has gkfbdvyx');
assert.ok(pids.includes('TS0601'), 'compose has TS0601');
assert.ok(/_tze204_gkfbdvyx/.test(deviceSrc), 'mains set includes gkfbdvyx');
assert.ok(/ZY_M100_CEILING_24G/.test(configsSrc) && /gkfbdvyx/.test(configsSrc), 'TYPE B config');

console.log('P2482 gkfbdvyx presence radar lock: PASS');

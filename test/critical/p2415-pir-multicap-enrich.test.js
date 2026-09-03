'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}
function hasMfr(c, m) {
  return (c.zigbee?.manufacturerName || []).some((x) => String(x).toLowerCase() === m.toLowerCase());
}
function hasPid(c, p) {
  return (c.zigbee?.productId || []).includes(p);
}

const presence = compose('presence_sensor_radar');
const motion = compose('motion_sensor');
const soil = compose('soil_sensor');
const climate = compose('climate_sensor');

assert.ok(hasMfr(presence, '_TZE200_grgol3xp'), 'grgol3xp on presence');
assert.ok(hasMfr(presence, '_TZE200_uli8wasj'), 'uli8wasj on presence');
assert.ok(!hasMfr(motion, '_TZE200_grgol3xp'), 'grgol3xp off motion');
assert.ok(!hasPid(motion, 'ZG-204ZV'), 'ZG-204ZV off motion cartesian');
assert.ok(hasMfr(soil, '_TZE284_o9ofysmo'), 'o9ofysmo on soil');
assert.ok(!hasMfr(climate, '_TZE284_o9ofysmo'), 'o9ofysmo off climate');

const configs = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
assert.ok(!configs.includes("'_TZE284_o9ofysmo'"), 'soil mfr not in radar configs');
assert.ok(!configs.includes("'_TZE204_r0jdjrvi'"), 'curtain mfr not in radar configs');

console.log('P2415 PIR multicap enrich: PASS');

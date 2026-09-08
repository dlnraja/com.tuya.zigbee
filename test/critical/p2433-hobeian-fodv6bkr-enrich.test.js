'use strict';

/**
 * P2433 — HOBEIAN non-native Homey gaps + Eduard tubular roller DP fix
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function compose(driverId) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
}

function testHobeianLocks() {
  const siren = compose('siren');
  assert.ok((siren.zigbee.productId || []).includes('ZG-229Z'), 'siren ZG-229Z');
  assert.ok((siren.zigbee.manufacturerName || []).some((m) => /hobeian/i.test(m)));

  const radar = compose('presence_sensor_radar');
  assert.ok((radar.zigbee.productId || []).includes('ZG-204ZP'));

  const btn = compose('button_wireless_1');
  assert.ok((btn.zigbee.productId || []).includes('ZG-101ZD'));

  const s1 = compose('switch_1gang');
  assert.ok((s1.zigbee.productId || []).includes('ZG-301Z'));
  assert.ok((s1.zigbee.productId || []).includes('ZG-302Z1'));

  const s2 = compose('switch_2gang');
  assert.ok((s2.zigbee.productId || []).includes('ZG-302Z2'));
  assert.ok((s2.zigbee.productId || []).includes('ZG-301Z-2CH'));
}

function testCartesianStrip() {
  const curtain = compose('curtain_motor');
  const pids = (curtain.zigbee.productId || []).map(String);
  assert.ok(!pids.includes('ZG-301Z'), 'curtain must not steal ZG-301Z');
  assert.ok(!pids.includes('ZG-302Z1'), 'curtain must not steal ZG-302Z1');

  const contact = compose('sensor_contact_zigbee');
  assert.ok(!(contact.zigbee.productId || []).includes('ZG-101ZD'));
}

function testP2382Alias() {
  const alias = path.join(ROOT, 'test/critical/p2382-ef00-wall-dimmer-hybrid-skip.test.js');
  assert.ok(fs.existsSync(alias), 'p2382 wall-dimmer alias must exist');
}

function main() {
  testHobeianLocks();
  testCartesianStrip();
  testP2382Alias();
  require('./p2428-eduard-roller-blind.test.js');
  console.log('P2433 HOBEIAN + fodv6bkr gates OK');
}

main();

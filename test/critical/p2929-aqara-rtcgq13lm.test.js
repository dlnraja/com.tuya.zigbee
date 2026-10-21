'use strict';
// P2929: Aqara RTCGQ13LM (LUMI / lumi.motion.agl04) on motion_sensor with native Occupancy Sensing 0x0406.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../../app.json');
const c = require('../../drivers/motion_sensor/driver.compose.json');
test('couple and occupancy cluster are in compose and app.json', () => {
  for (const z of [c.zigbee, app.drivers.find((d) => d.id === 'motion_sensor').zigbee]) {
    assert.ok(z.manufacturerName.includes('LUMI')); assert.ok(z.productId.includes('lumi.motion.agl04'));
    assert.deepStrictEqual(z.endpoints['1'].clusters.slice(0, 2), [0, 1030]);
  }
});
test('no other driver claims LUMI x lumi.motion.agl04', () => {
  const others = app.drivers.filter((d) => d.id !== 'motion_sensor' && d.zigbee
    && (d.zigbee.manufacturerName || []).some((m) => m.toLowerCase() === 'lumi')
    && (d.zigbee.productId || []).some((p) => p.toLowerCase() === 'lumi.motion.agl04'));
  assert.deepStrictEqual(others.map((d) => d.id), []);
});

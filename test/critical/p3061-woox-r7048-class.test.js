'use strict';
// P3061: Woox R7048 temp/humidity sensor (TS0201) must resolve to the
// temperature/humidity driver, not to an RGB bulb driver. Source: Z2M
// woox definition (R7048 fingerprints) and deCONZ; report: dlnraja/com.tuya.zigbee#490.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = (d) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../drivers', d, 'driver.compose.json'), 'utf8'));
const has = (c, m) => (c.zigbee.manufacturerName || []).some((x) => x.toLowerCase() === m);
test('amqudjr0 lives only on lcdtemphumidsensor with TS0201', () => {
  const sensor = read('lcdtemphumidsensor');
  const bulb = read('bulb_rgb');
  assert.ok(has(sensor, '_tz3000_amqudjr0'));
  assert.ok(sensor.zigbee.productId.includes('TS0201'));
  assert.ok(!has(bulb, '_tz3000_amqudjr0'));
  assert.ok(has(sensor, '_tz3000_rusu2vzb'), 'twin R7048 fingerprint kept');
});

'use strict';
/* eslint-env mocha */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('P3374 GreenBlue GB740 _TZ3250_int1a7ht TS020C (forum 162420 / ZHA #5709)', () => {
  it('is on pir_sensor_2 with motion+battery, without invented climate caps in compose', () => {
    const compose = JSON.parse(fs.readFileSync(path.join(__dirname, '../drivers/pir_sensor_2/driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    const pids = (compose.zigbee.productId || []).map((p) => String(p).toUpperCase());
    assert.ok(mfrs.includes('_tz3250_int1a7ht'));
    assert.ok(pids.includes('TS020C'));
    const caps = compose.capabilities || [];
    assert.ok(caps.includes('alarm_motion'));
    assert.ok(caps.includes('measure_battery'));
    assert.ok(!caps.includes('measure_temperature'));
    assert.ok(!caps.includes('measure_humidity'));
  });
});

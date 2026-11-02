'use strict';
// WHY(P3212): Saswell SEA801 TRVs (zhc saswell.ts) sat on climate_sensor (no setpoint control) and the
// radiator_valve 'standard' profile read their DP101/102/103 as contact/dim/boost. They now live on
// radiator_valve only, with a 'saswell' DP profile: 101 state, 102 temp/10, 103 setpoint/10 (write x10).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const MOVED = ['_TZE200_0dvm9mva', '_TZE284_0dvm9mva', '_TZE200_9m4kmbfu', '_TZE284_9m4kmbfu', '_TZE200_3yp57tby', '_TZE284_3yp57tby'];
const ADDED = ['_TZE200_3ymoslep', '_TZE204_3ymoslep', '_TZE284_3ymoslep', '_TZE2841000000_3ymoslep'];

describe('P3212 Saswell SEA801 on radiator_valve with saswell DP profile', () => {
  const rv = J('drivers/radiator_valve/driver.compose.json').zigbee.manufacturerName;
  const cs = J('drivers/climate_sensor/driver.compose.json').zigbee.manufacturerName.map((m) => m.toLowerCase());
  it('sourced couples are on radiator_valve in canonical form', () => {
    for (const m of [...MOVED, ...ADDED]) {assert.ok(rv.includes(m), m);}
  });
  it('one couple, one driver: moved couples left climate_sensor', () => {
    for (const m of MOVED) {assert.ok(!cs.includes(m.toLowerCase()), m);}
  });
  it('device maps the saswell DPs and writes setpoint on DP103', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/radiator_valve/device.js'), 'utf8');
    assert.match(src, /saswellIds = \['_0dvm9mva', '_9m4kmbfu', '_3yp57tby', '_3ymoslep'\]/);
    assert.match(src, /103: \{ capability: 'target_temperature', divisor: 10 \}/);
    assert.match(src, /102: \{ capability: 'measure_temperature', divisor: 10 \}/);
    assert.match(src, /_sendTuyaDP\(103, Math\.round\(safeMultiply\(v, 10, 10\)\), 'value'\)/);
    assert.match(src, /_sendTuyaDP\(101, !!v, 'bool'\)/);
  });
});

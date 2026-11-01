'use strict';
const assert = require('assert');
const g = require('../lib/garage/garageTrigger');
describe('P3144 garage TS0603 _TZE608_ trigger (forum 149230, Z2M tuya.ts)', () => {
  it('TZE608 TS0603 is pulse: close and open both write DP1=true', () => {
    assert.strictEqual(g.isPulseTrigger('_TZE608_xkr8gep3', 'TS0603'), true);
    assert.strictEqual(g.dp1Value(true, true), true);
    assert.strictEqual(g.dp1Value(false, true), true);
  });
  it('other couples keep open=true / close=false', () => {
    assert.strictEqual(g.isPulseTrigger('_TZE20C_3oycaicw', 'TS0601'), false);
    assert.strictEqual(g.dp1Value(true, false), false);
    assert.strictEqual(g.dp1Value(false, false), true);
  });
  it('device.js wires the helper', () => {
    const s = require('fs').readFileSync(require('path').join(__dirname, '../drivers/garage_door_opener/device.js'), 'utf8');
    assert.ok(/garageTrigger\.dp1Value\(value, pulse\)/.test(s) && /!pulse && this\.zclNode/.test(s));
  });
});

'use strict';
const assert = require('assert');
const g = require('../lib/garage/garageTrigger');
describe('P3144 garage TS0603 _TZE608_ trigger (forum 149230, Z2M tuya.ts)', () => {
  it('TZE608 TS0603 is pulse: close and open both write DP1=true', () => {
    assert.strictEqual(g.isPulseTrigger('_TZE608_xkr8gep3', 'TS0603'), true);
    assert.strictEqual(g.dp1Value(true, true), true);
    assert.strictEqual(g.dp1Value(false, true), true);
  });
  it('P3159: all 4 Z2M exact TS0603 couples match, case-insensitive', () => {
    for (const m of ['_TZE608_c75zqghm', '_TZE608_fmemczv1', '_TZE608_xkr8gep3', '_TZE608_LAPUUOKE']) { assert.strictEqual(g.isPulseTrigger(m, 'TS0603'), true, m); }
  });
  it('P3159: no prefix match (other _TZE608_/_TZE208_, wrong pid)', () => {
    assert.strictEqual(g.isPulseTrigger('_TZE608_unknown1', 'TS0603'), false);
    assert.strictEqual(g.isPulseTrigger('_TZE208_xkr8gep3', 'TS0603'), false);
    assert.strictEqual(g.isPulseTrigger('_TZE608_xkr8gep3', 'TS0601'), false);
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

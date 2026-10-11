'use strict';
/* eslint-env mocha */
// #108/#109 exact-pair drivers built on TuyaDpProfileDevice (DP layouts from zigbee-herdsman-converters).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('../lib/tuya/TuyaDpProfileCodec');

const root = path.join(__dirname, '..');
const compose = (d) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8'));

describe('TuyaDpProfileCodec', () => {
  it('decodes relays, presence, cover state and position', () => {
    assert.strictEqual(decode({ kind: 'bool' }, 1), true);
    assert.strictEqual(decode({ kind: 'bool' }, Buffer.from([0])), false);
    assert.strictEqual(decode({ kind: 'presence' }, 1), true);
    assert.strictEqual(decode({ kind: 'presence' }, 0), false);
    assert.strictEqual(decode({ kind: 'coverState' }, 2), 'down');
    assert.strictEqual(decode({ kind: 'coverPos' }, 40), 0.4);
    assert.strictEqual(decode({ kind: 'coverPos', invert: true }, 40), 0.6);
    assert.strictEqual(decode({ kind: 'value', divisor: 10 }, 2305), 230.5);
  });
  it('encodes Homey values back to Tuya DPs', () => {
    assert.deepStrictEqual(encode({ kind: 'coverState' }, 'up'), { value: 0, type: 'enum' });
    assert.deepStrictEqual(encode({ kind: 'coverState' }, 'idle'), { value: 1, type: 'enum' });
    assert.deepStrictEqual(encode({ kind: 'coverPos' }, 0.25), { value: 25, type: 'value' });
    assert.deepStrictEqual(encode({ kind: 'bool' }, 0), { value: false, type: 'bool' });
  });
});

// WHY(P99/P2677): case-variant passes add lowercase/upper twins; compare canonical spellings
// (prefix UPPER + suffix lower) only.
const isCanon = (m) => { const i = m.indexOf('_', 1); return m.startsWith('_TZE') && i > 0 && m.slice(i) === m.slice(i).toLowerCase(); };

describe('exact-pair drivers', () => {
  it('switch_presence_tuya carries the three ZHC presence switches with relays + alarm_motion', () => {
    const j = compose('switch_presence_tuya');
    // CI ensure-case-variants adds lowercase twins; compare the canonical spellings only.
    assert.deepStrictEqual(j.zigbee.manufacturerName.filter(isCanon).sort(), ['_TZE28C1000000_jaunkx9g', '_TZE28C1000000_jlbsptkl', '_TZE28C1000000_usmqzgdm']);
    assert.ok(j.capabilities.includes('alarm_motion'));
    assert.ok(!j.zigbee.endpoints['1'].clusters.includes(61184), 'EF00 must not be mandatory');
    const src = fs.readFileSync(path.join(root, 'drivers', 'switch_presence_tuya', 'device.js'), 'utf8');
    assert.ok(/101: \{ cap: 'alarm_motion', kind: 'presence' \}/.test(src));
  });
  it('panel_switch_cover_tuya maps DP101/102 relays and DP1/2, DP4/5 covers', () => {
    const j = compose('panel_switch_cover_tuya');
    assert.deepStrictEqual(j.zigbee.manufacturerName.filter(isCanon), ['_TZE200_rgeapp2c']);
    const src = fs.readFileSync(path.join(root, 'drivers', 'panel_switch_cover_tuya', 'device.js'), 'utf8');
    for (const re of [/1: \{ cap: 'windowcoverings_state.c1'/, /5: \{ cap: 'windowcoverings_set.c2'/, /102: \{ cap: 'onoff.s2'/]) { assert.ok(re.test(src), re); }
  });
  it('old drivers keep their couples (never remove)', () => {
    assert.ok(compose('curtain_motor').zigbee.manufacturerName.includes('_TZE200_rgeapp2c'));
    assert.ok(compose('climate_sensor').zigbee.manufacturerName.includes('_TZE284_9xstqowh'));
  });
  it('energy_meter_3phase has the D4Z profile and valve_dual_irrigation a main switch', () => {
    const em = fs.readFileSync(path.join(root, 'drivers', 'energy_meter_3phase', 'device.js'), 'utf8');
    assert.ok(em.includes("mfr.endsWith('_loejka0i')") && em.includes("102: { capability: 'measure_voltage', divisor: 10 }"));
    const v = compose('valve_dual_irrigation');
    assert.strictEqual(v.capabilities[0], 'onoff');
    assert.ok(v.capabilities.includes('onoff.valve_1') && v.capabilities.includes('onoff.valve_2'));
  });
});

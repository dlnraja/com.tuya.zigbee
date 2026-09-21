'use strict';
/**
 * P2665 — Contre quoi: Bastien Developer Tools mesh still ~5k TX/HOBEIAN
 * - skip EF00 queryAll on HOBEIAN
 * - disable genPowerCfg reporting
 * - no boot ON nudge unless onTime leftover
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const calm = require(path.join(ROOT, 'lib/zigbee/MeshFloodCalm.js'));

describe('P2665 Bastien mesh deepen calm', () => {
  it('shouldSkipEf00Query true when HOBEIAN flags set', () => {
    assert.equal(calm.shouldSkipEf00Query({ _hobeianZg301z: true }), true);
    assert.equal(calm.shouldSkipEf00Query({ _skipEf00Tx: true }), true);
    assert.equal(calm.shouldSkipEf00Query({ _noEf00Query: true }), true);
    assert.equal(calm.shouldSkipEf00Query({}), false);
  });

  it('calmHobeianMesh sets EF00 skip + disables powerCfg', async () => {
    const calls = [];
    const device = {
      configureAttributeReporting: async (c) => { calls.push(c); },
      log: () => {},
    };
    await calm.calmHobeianMesh(device);
    assert.equal(device._skipEf00Tx, true);
    assert.equal(device._noEf00Query, true);
    assert.equal(device._hobeianZg301z, true);
    const flat = calls.flat();
    assert.ok(flat.some((c) => /powerCfg|powerConfiguration/i.test(c.cluster)
      && c.attributeName === 'batteryPercentageRemaining'));
  });

  it('TuyaZigbeeDevice skips EF00 query via shouldSkipEf00Query', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.match(src, /shouldSkipEf00Query/);
    assert.match(src, /P2665/);
  });

  it('Hobeian heal only ON-nudges when onTime leftover', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'), 'utf8');
    assert.match(src, /hasCountdown/);
    assert.match(src, /P2665/);
  });

  it('switch_1gang profile noEf00Tx for HOBEIAN', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/device.js'), 'utf8');
    assert.match(src, /getDeviceProfile/);
    assert.match(src, /noEf00Tx:\s*true/);
  });
});

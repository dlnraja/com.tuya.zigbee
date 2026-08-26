'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { describe, it } = require('node:test');
const { applyPolarity, INVERTED_POLARITY } = require('../../lib/managers/AlarmPolarityManager');

const ROOT = path.join(__dirname, '..', '..');

describe('P2271 gnpflcoq inverted presence + soft locks', () => {
  it('lists gnpflcoq as inverted motion polarity', () => {
    assert.ok(INVERTED_POLARITY.some((e) => /gnpflcoq/i.test(e)));
  });

  it('DP1 raw=1 (clear) → Homey alarm false when inverted', () => {
    const device = {
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZE284_gnpflcoq' : k === 'zb_model_id' ? 'TS0601' : k === 'alarm_polarity' ? 'auto' : null),
      getStoreValue: () => null,
      getData: () => ({ manufacturerName: '_TZE284_gnpflcoq', productId: 'TS0601' }),
    };
    const occupied = applyPolarity(device, false, 'motion');
    const clear = applyPolarity(device, true, 'motion');
    assert.strictEqual(occupied.value, true, '0=occupied → alarm true');
    assert.strictEqual(clear.value, false, '1=clear → alarm false');
  });

  it('compose soft-locks RF cloner + Moes curtain', () => {
    const ir = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'ir_blaster', 'driver.compose.json'), 'utf8'));
    assert.ok((ir.zigbee.manufacturerName || []).some((m) => /tdg4ckyh/i.test(m)));
    const curtain = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'wall_curtain_switch', 'driver.compose.json'), 'utf8'));
    assert.ok((curtain.zigbee.manufacturerName || []).some((m) => /kq1l5eu5/i.test(m)));
  });
});

describe('P2272 discussion couple locks', () => {
  it('locks bjoccxbi / lq0ffndf / hdc8bbha couples in compose + fingerprint DB', () => {
    const rgb = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'led_controller_rgb', 'driver.compose.json'), 'utf8'));
    assert.ok((rgb.zigbee.manufacturerName || []).some((m) => /bjoccxbi/i.test(m)));
    const usb = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'usb_outlet_advanced', 'driver.compose.json'), 'utf8'));
    assert.ok((usb.zigbee.manufacturerName || []).some((m) => /lq0ffndf/i.test(m)));
    const db = fs.readFileSync(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'), 'utf8');
    assert.ok(db.includes('_TZ3218_hdc8bbha|TS000F'));
    assert.ok(db.includes('_TZE284_bjoccxbi|TS0601'));
    assert.ok(db.includes('_TZE284_lq0ffndf|TS0601'));
  });
});

describe('P2273 ZHA unsteal curtain + soil locks', () => {
  it('guvc7pdy is on curtain_motor not switch_1gang', () => {
    const sw = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'));
    assert.ok(!(sw.zigbee.manufacturerName || []).some((m) => /guvc7pdy/i.test(m)));
    const curtain = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'curtain_motor', 'driver.compose.json'), 'utf8'));
    assert.ok((curtain.zigbee.manufacturerName || []).some((m) => /guvc7pdy/i.test(m)));
  });

  it('fingerprint DB locks hdml1aav soil + jtbgusdc dual dimmer', () => {
    const db = fs.readFileSync(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'), 'utf8');
    assert.ok(db.includes('_TZE284_hdml1aav|TS0601'));
    assert.ok(db.includes('_TZE204_guvc7pdy|TS0601'));
    assert.ok(db.includes('_TZE284_jtbgusdc|TS0601'));
  });
});

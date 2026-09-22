'use strict';

/**
 * P2681 — Ghost physical flows + dzwgk7e2 sticky Contre quoi (2026-09-22)
 *
 * Contre quoi:
 * - Bastien diag 8f0915fa: null→false PHYSICAL floods switch_1gang_physical_off
 *   across every switch after init → "boutons aléatoires" Homey Flows
 * - Bastien f37e8a91: BaseUnifiedDevice.getDeviceProfile shadowed mixin →
 *   "undefined device profile" + weak debounce on _TZ3000_dzwgk7e2+TS0042
 * Dual-app: BOTH (reliability)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2681 bootstrap ghost flows + dzwgk7e2 profile', () => {
  it('PhysicalButtonMixin skips null/undefined lastState bootstrap (ZCL + DP)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('bootstrap seed'), 'must log bootstrap seed');
    assert.ok(/previousState === null \|\| previousState === undefined/.test(src));
    const zclIdx = src.indexOf('  _handleAttributeReport(gang, value, data)');
    assert.ok(zclIdx > 0, 'ZCL handler definition');
    const zclSlice = src.slice(zclIdx, zclIdx + 4000);
    assert.ok(/bootstrap seed/.test(zclSlice), 'ZCL path must seed without flow');
    assert.ok(/previousState === null/.test(zclSlice));
    assert.ok(src.includes('[PHYSICAL-DP]') && /PHYSICAL-DP[\s\S]{0,800}bootstrap seed/.test(src));
  });

  it('init seeds lastState from onoff capability (not always null)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/seed from Homey capability|seedState/.test(src));
    assert.ok(/lastState:\s*seedState/.test(src));
  });

  it('dzwgk7e2 DEVICE_PROFILES is hybrid debounce 1200', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const idx = src.indexOf("'_TZ3000_dzwgk7e2'");
    assert.ok(idx >= 0, 'dzwgk7e2 profile must exist');
    const block = src.slice(idx, idx + 450);
    assert.ok(/protocol:\s*'hybrid'/.test(block));
    assert.ok(/debounceMs:\s*1200/.test(block));
    assert.ok(/skip8004:\s*true/.test(block));
    assert.ok(/productId:\s*'TS0042'/.test(block));
  });

  it('BaseUnifiedDevice.getDeviceProfile delegates to mixin/super', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    const idx = src.indexOf('getDeviceProfile(overrides');
    assert.ok(idx >= 0, 'must accept overrides + merge');
    const block = src.slice(Math.max(0, idx - 500), idx + 1200);
    assert.ok(/super\.getDeviceProfile/.test(block), 'must call super (mixin)');
    assert.ok(/P2681/.test(block));
    assert.ok(/mixinProfile/.test(block));
  });

  it('button_wireless_2 forces TS0042 sticky profile', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/device.js'), 'utf8');
    assert.ok(/getDeviceProfile\(/.test(src));
    assert.ok(/debounceMs:\s*Math\.max/.test(src));
    assert.ok(/_isDzwgk7e2Phantom4Ep/.test(src));
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/driver.compose.json'), 'utf8')
    );
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /dzwgk7e2/i.test(m)));
    assert.ok((c.zigbee.productId || []).includes('TS0042'));
  });

  it('TS0042/43/44 remote fallback debounce >= 1200', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/TS004\[234\].*1200|1200.*TS004\[234\]/.test(src.replace(/\s+/g, ' ')));
  });
});

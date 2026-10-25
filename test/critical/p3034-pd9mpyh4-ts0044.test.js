'use strict';
// P3034 (daily KB 2026-10-25): _TZ3000_pd9mpyh4 + TS0044 is a battery 4-button scene remote
// (device interview in JohanBendz/com.tuya.zigbee#1534, reporter motren). One couple = one driver:
// scene_switch_4 only, both case forms, TS0044 listed, and no other driver carries the mfr.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MFR = '_tz3000_pd9mpyh4';
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const has = (z) => [].concat((z && z.manufacturerName) || []).some((m) => String(m).toLowerCase() === MFR);

describe('P3034 _TZ3000_pd9mpyh4 TS0044 scene remote', () => {
  it('lives in scene_switch_4 (compose + app.json) with both case forms and TS0044', () => {
    const z = read('drivers/scene_switch_4/driver.compose.json').zigbee;
    assert.ok(z.manufacturerName.includes('_TZ3000_pd9mpyh4'));
    assert.ok(z.manufacturerName.includes('_tz3000_pd9mpyh4'));
    assert.ok(z.productId.some((p) => String(p).toUpperCase() === 'TS0044'));
    const app = read('app.json').drivers.find((d) => d.id === 'scene_switch_4');
    assert.ok(app && has(app.zigbee));
  });
  it('is in no other driver', () => {
    const owners = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => {
      const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      return fs.existsSync(p) && has(read(path.join('drivers', d, 'driver.compose.json')).zigbee);
    });
    assert.deepStrictEqual(owners, ['scene_switch_4']);
  });
  it('is recorded with its source in the registry', () => {
    const c = read('data/user-misattribution-registry.json').cases.find((x) => x.id === 'p3034-pd9mpyh4-ts0044-scene');
    assert.ok(c && /issues\/1534/.test(c.source) && c.canonicalDriver === 'scene_switch_4');
  });
});

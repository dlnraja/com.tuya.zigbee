'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { isBatteryCoverMfr } = require('../../lib/helpers/batteryPowerSource');

describe('P2297 m6lwazh9 curtain sacred locks', () => {
  it('switch_1gang no longer claims m6lwazh9', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'), 'utf8'));
    assert.ok(!(j.zigbee.manufacturerName || []).some((m) => /m6lwazh9/i.test(m)));
  });

  it('curtain_motor owns TZE200+TS0601 and TZE210+TS0301 casings', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const mfrs = j.zigbee.manufacturerName || [];
    assert.ok(mfrs.some((m) => m === '_TZE200_m6lwazh9'));
    assert.ok(mfrs.some((m) => m === '_TZE210_m6lwazh9'));
    const pids = (j.zigbee.productId || []).map((p) => String(p).toUpperCase());
    assert.ok(pids.includes('TS0601'));
    assert.ok(pids.includes('TS0301'));
  });

  it('registry locks both couples forbid switch_1gang', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const a = reg.cases.find((c) => c.id === 'p2297-m6lwazh9-tze210-ts0301-curtain');
    const b = reg.cases.find((c) => c.id === 'p2297-m6lwazh9-tze200-ts0601-curtain');
    assert.ok(a && b);
    assert.equal(a.canonicalDriver, 'curtain_motor');
    assert.equal(b.canonicalDriver, 'curtain_motor');
    assert.ok(a.forbiddenDrivers.includes('switch_1gang'));
    assert.ok(b.forbiddenDrivers.includes('switch_1gang'));
    assert.deepEqual(a.productId, ['TS0301']);
    assert.deepEqual(b.productId, ['TS0601']);
  });

  it('m6lwazh9 treated as battery cover for MCU/power helpers', () => {
    assert.equal(isBatteryCoverMfr('_TZE210_m6lwazh9'), true);
    assert.equal(isBatteryCoverMfr('_TZE200_m6lwazh9'), true);
  });

  it('A_Tas t9ynfz4x+TS0225 locked mmwave when pid present', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const c = reg.cases.find((x) => x.id === 'p2297-t9ynfz4x-ts0225-mmwave');
    assert.ok(c);
    assert.equal(c.canonicalDriver, 'motion_sensor_radar_mmwave');
    assert.deepEqual(c.productId, ['TS0225']);
    const j = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/motion_sensor_radar_mmwave/driver.compose.json'), 'utf8'),
    );
    assert.ok((j.zigbee.manufacturerName || []).some((m) => /t9ynfz4x/i.test(m)));
    assert.ok((j.zigbee.productId || []).includes('TS0225'));
  });
});

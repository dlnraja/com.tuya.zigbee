'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function readCompose(driverId) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
}

describe('P2207 Tongou TO-Q-SYS-JZT sacred couple', () => {
  it('din_rail_meter owns _TZE284_6ocnqlhn + TS0601', () => {
    const compose = readCompose('din_rail_meter');
    const mfrs = compose.zigbee.manufacturerName.map((m) => m.toLowerCase());
    const pids = compose.zigbee.productId.map((p) => p.toUpperCase());
    assert.ok(mfrs.includes('_tze284_6ocnqlhn'));
    assert.ok(pids.includes('TS0601'));
  });

  it('smart_rcbo must not claim _TZE284_6ocnqlhn', () => {
    const compose = readCompose('smart_rcbo');
    const mfrs = (compose.zigbee.manufacturerName || []).map((m) => m.toLowerCase());
    assert.ok(!mfrs.some((m) => m.includes('6ocnqlhn')));
  });

  it('misattribution registry locks couple to din_rail_meter', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const row = reg.cases.find((c) => c.id === 'tongou-to-q-sys-jzt-din-meter');
    assert.ok(row);
    assert.equal(row.canonicalDriver, 'din_rail_meter');
    assert.ok(row.forbiddenDrivers.includes('smart_rcbo'));
  });
});

'use strict';

/**
 * P2452 — GH #533/#541/#543/#544/#545 residual SSOT after P2435 compose fix.
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const fs = require('fs');
const path = require('path');

const fp = JSON.parse(fs.readFileSync(path.join(__dirname, '../../lib/tuya/fingerprints.json'), 'utf8'));
const mfs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/mfs_db.json'), 'utf8'));
const fpdb = fs.readFileSync(path.join(__dirname, '../../lib/DeviceFingerprintDB.js'), 'utf8');
const sw4 = JSON.parse(fs.readFileSync(path.join(__dirname, '../../drivers/switch_4gang/driver.compose.json'), 'utf8'));

describe('P2452 — GH issue SSOT locks', () => {
  // WHY(P2455): migueleap — wired BSEED needs wall_switch_2gang_1way (not switch_2gang button tiles).
  it('#544 l9brjwau+TS0002 → wall_switch_2gang_1way', () => {
    assert.strictEqual(fp._TZ3000_l9brjwau.driverId, 'wall_switch_2gang_1way');
    assert.ok(fp._TZ3000_l9brjwau.modelIds.includes('TS0002'));
    assert.strictEqual(mfs.sacredCouples['_tz3000_l9brjwau|ts0002'].driver, 'wall_switch_2gang_1way');
  });

  it('#543 ptjcjise+TS0002 → switch_2gang (not switch_1gang)', () => {
    assert.strictEqual(fp._TZ3000_ptjcjise.driverId, 'switch_2gang');
    assert.ok(fp._TZ3000_ptjcjise.modelIds.includes('TS0002'));
  });

  it('#533 5slehgeo → curtain_motor TS0601 (not climate/TS0201)', () => {
    assert.strictEqual(fp._TZE204_5SLEHGEO.driverId, 'curtain_motor');
    assert.deepStrictEqual(fp._TZE204_5SLEHGEO.modelIds, ['TS0601']);
    assert.strictEqual(mfs.sacredCouples._TZE204_5SLEHGEO.driverId, 'curtain_motor');
  });

  it('#545 ysdv91bk+TS0001 locked switch_1gang in FPDB', () => {
    assert.ok(/_TZ3000_ysdv91bk\|TS0001/.test(fpdb));
    assert.ok(/switch_1gang/.test(fpdb));
    assert.ok(!/_TZ3000_ysdv91bk\|TS0002/.test(fpdb));
  });

  it('#541 switch_4gang has no phantom button.* caps', () => {
    assert.ok(!sw4.capabilities.some((c) => /^button/.test(c)));
    assert.ok(sw4.capabilities.includes('onoff.gang4'));
  });
});

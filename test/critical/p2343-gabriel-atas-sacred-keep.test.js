'use strict';

/**
 * P2343 — Gabriel Zemismart sacred-keep + A_Tas Linptech ES1 (forum 2026-08-31)
 * Cross-ref: Z2M ES1ZZ(TY), SHKXSGIS TS0601 4-gang, Zemismart 3-gang TS0003 BSEED compose.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function couplePinned(mfr, pid, driverId) {
  const ssot = loadJson('config/architecture/publish-sacred-keep-couples.json');
  return ssot.couples.some(
    (c) => c.driverId === driverId
      && String(c.mfr).toLowerCase() === mfr.toLowerCase()
      && String(c.pid).toUpperCase() === pid.toUpperCase(),
  );
}

describe('P2343 Gabriel Zemismart + A_Tas Linptech sacred keep', () => {
  it('pins Zemismart 4-gang SHKXSGIS + AAGRXLBD TS0601 on wall_switch_4_gang_tuya', () => {
    for (const mfr of ['_TZE200_SHKXSGIS', '_TZE284_SHKXSGIS', '_TZE204_AAGRXLBD']) {
      assert.ok(couplePinned(mfr, 'TS0601', 'wall_switch_4_gang_tuya'), `missing ${mfr}+TS0601`);
    }
  });

  it('pins Gabriel 3-gang ZCL mfrs on wall_switch_3gang_1way', () => {
    for (const mfr of ['_TZ3000_VJHCENZO', '_TZ3000_QXCNWV26', '_TZ3000_EQSAIR32']) {
      assert.ok(couplePinned(mfr, 'TS0003', 'wall_switch_3gang_1way'), `missing ${mfr}+TS0003`);
    }
  });

  it('Linptech ES1 profile accepts A_Tas mfr without pid (P2289)', () => {
    const { isLinptechES1 } = require('../../lib/profiles/LinptechES1Profile');
    assert.strictEqual(isLinptechES1('_TZ3218_t9ynfz4x', ''), true);
    assert.strictEqual(isLinptechES1('_TZ3218_t9ynfz4x', 'TS0225'), true);
  });

  it('A_Tas couple remains pinned on motion_sensor_radar_mmwave', () => {
    assert.ok(couplePinned('_TZ3218_t9ynfz4x', 'TS0225', 'motion_sensor_radar_mmwave'));
  });
});

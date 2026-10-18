'use strict';
// PCr2 #43: Johan PR evaluation. All Tuya-format couples from the 15 PRs were already present;
// the one missing exact couple found (PR #1230 / issue #1007 interview: OWON THS317-ET-TY reports
// _TZE200_iq4ygaai + TS0201, clusters 0/1/1026/1029/0xEF00) lives in temphumidsensor, whose
// endpoint list matches that interview. The old motion_sensor entry is kept (never remove).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const zig = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;

describe('Johan PR ports (PCr2 #43)', () => {
  it('_TZE200_iq4ygaai / TS0201 pairs as a temperature/humidity sensor', () => {
    const z = zig('temphumidsensor');
    assert.ok(z.manufacturerName.includes('_TZE200_iq4ygaai'));
    assert.ok(z.productId.includes('TS0201'));
    const eps = z.endpoints['1'].clusters;
    for (const c of [1026, 1029, 61184]) assert.ok(eps.includes(c), String(c));
  });
  it('motion_sensor has no TS0201 and no longer claims iq4ygaai (no new collision)', () => {
    const z = zig('motion_sensor');
    // WHY(9923a4a17c): iq4ygaai is the THS317-ET-TY temp/humidity sensor; it was dropped from motion_sensor and lives
    // only on temphumidsensor (asserted above), so it must not come back here.
    assert.ok(!z.manufacturerName.map((m) => m.toLowerCase()).includes('_tze200_iq4ygaai'));
    assert.ok(!z.productId.map((p) => p.toLowerCase()).includes('ts0201'));
  });
});

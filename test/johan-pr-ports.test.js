'use strict';
// PCr2 #43: Johan PR evaluation. All Tuya-format couples from the 15 PRs were already present;
// the one missing exact couple found (PR #1230 / issue #1007 interview: OWON THS317-ET-TY reports
// _TZE200_iq4ygaai + TS0201, clusters 0/1/1026/1029/0xEF00) lives in temphumidsensor, whose
// endpoint list matches that interview. The old motion_sensor entry was later dropped by the W4
// lost-couples pass (Z2M lists this mfr only with TS0201; no motion pid fits) and is recorded in
// curated-couple-removals.json.
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
  it('motion_sensor never claims iq4ygaai+TS0201; W4 removal is a recorded curated removal', () => {
    const z = zig('motion_sensor');
    assert.ok(!z.productId.map((p) => p.toLowerCase()).includes('ts0201'));
    const cur = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/curated-couple-removals.json'), 'utf8'));
    assert.ok(cur.removals.some((r) => r.driver === 'motion_sensor'
      && (r.mfr || []).some((m) => m.toLowerCase() === '_tze200_iq4ygaai')));
  });
});

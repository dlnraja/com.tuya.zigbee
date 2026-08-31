'use strict';

/**
 * P2288 — Sacred keep couples survive publish compaction (BOTH)
 * WHY: Athom budget cuts must not drop mrpevh8p/TS0041, Tongou, BSEED, etc.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const {
  compactZigbeeIdentifiers,
  loadSacredKeepCouples,
  assertSacredCouplesPresent,
} = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

const ROOT = path.join(__dirname, '..', '..');

describe('P2288 publish sacred-keep compaction', () => {
  it('loads sacred keep list with verified couples', () => {
    const sacred = loadSacredKeepCouples(ROOT);
    assert.ok(sacred.length >= 15, `expected ≥15 sacred couples, got ${sacred.length}`);
    // WHY(P2348): pin.mfr stays EXACT device case (Homey pairing case-sensitive).
    assert.ok(
      sacred.some((c) => c.mfr === '_TZ3000_mrpevh8p' && c.pid === 'TS0041'),
      'mrpevh8p+TS0041 pinned with exact device-case mfr'
    );
    assert.ok(sacred.some((c) => c.mfr === '_TZ3000_kfu8zapd' && c.pid === 'TS0044'));
    assert.ok(sacred.some((c) => /^hobeian$/i.test(c.mfr) && c.pid === '3315-S'));
  });

  it('aggressive compaction keeps sacred couples in manifest clone', () => {
    const appPath = path.join(ROOT, 'app.json');
    assert.ok(fs.existsSync(appPath), 'app.json required');
    const manifest = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    const sacred = loadSacredKeepCouples(ROOT);
    const result = compactZigbeeIdentifiers(manifest, {
      maxDriverCombos: 80,
      maxTotalCombos: 8000,
      sacredKeep: sacred,
    });
    assert.strictEqual((result.sacredMissing || []).length, 0, result.sacredMissing?.join('; '));
    assertSacredCouplesPresent(manifest, sacred);
    const bw1 = (manifest.drivers || []).find((d) => d.id === 'button_wireless_1');
    assert.ok(bw1?.zigbee?.productId?.map(String).includes('TS0041'));
    assert.ok(
      (bw1.zigbee.manufacturerName || []).some((m) => /mrpevh8p/i.test(m)),
      'mrpevh8p must survive compaction on button_wireless_1'
    );
  });
});

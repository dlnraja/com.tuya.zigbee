'use strict';
/**
 * P2866 — fix-fingerprint-conflicts must never strip the HOBEIAN brand typo form `heobian`.
 * WHY: each Auto-Publish bump commit ("vX: N drivers, M FPs") removed heobian/Heobian from button_wireless_1,
 * illuminance_sensor and vibration_sensor (resolver treated heobian as a plain cross-driver conflict).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

describe('P2866 heobian survives the conflict resolver', () => {
  it('MULTI_DRIVER_BRANDS covers heobian + hobeian + wing', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/automation/fix-fingerprint-conflicts.js'), 'utf8');
    const m = src.match(/MULTI_DRIVER_BRANDS\s*=\s*new Set\(\[([^\]]*)\]\)/);
    assert.ok(m, 'MULTI_DRIVER_BRANDS missing');
    for (const b of ['hobeian', 'heobian', 'wing']) assert.ok(m[1].includes(`'${b}'`), b);
  });
});

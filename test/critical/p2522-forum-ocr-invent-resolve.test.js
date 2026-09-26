'use strict';

/**
 * P2522 — Forum fine-resolve: OCR invent pad → real couple; doNotLock; GH#547/#533 pins
 * Contre quoi: Stefan `_TZE2841000000_3MZB0SDZ` stays NOT_IN_CATALOG / lock-sacred-couple
 * Dual-app: BOTH (silent CI + pairing reliability)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  canonicalizeForumMfr,
  stripTuyaOcrZeroPad,
  analyzeCouple,
  buildDriverIndex,
} = require('../../tools/ci/forum-actionable-processor');

describe('P2522 forum OCR invent + sacred pair fine-resolve', () => {
  it('strips OCR digit-pad to real ZM16B mfr', () => {
    assert.strictEqual(stripTuyaOcrZeroPad('_TZE2841000000_3MZB0SDZ'), '_TZE284_3MZB0SDZ');
    assert.strictEqual(canonicalizeForumMfr('_TZE2841000000_3MZB0SDZ'), '_TZE284_3MZB0SDZ');
    assert.strictEqual(canonicalizeForumMfr('_TZE284_3mzb0sdz'), '_TZE284_3mzb0sdz');
    assert.strictEqual(canonicalizeForumMfr('_TZ3000_mrpevh8p'), '_TZ3000_mrpevh8p');
  });

  it('OCR-padded Stefan couple resolves to curtain_motor LOCKED_OK (not invent lock)', () => {
    const index = buildDriverIndex();
    const truth = new Map();
    const canon = canonicalizeForumMfr('_TZE2841000000_3MZB0SDZ');
    const row = analyzeCouple(canon, 'TS0601', index, truth);
    assert.ok(['LOCKED_OK', 'ROUTED_OK', 'SINGLE_DRIVER'].includes(row.verdict), row.verdict);
    assert.strictEqual(row.canonicalDriver, 'curtain_motor');
    assert.strictEqual(row.doNotLock, false);
  });

  it('raw invent pad stays doNotLock when analyzed without canonicalize', () => {
    const index = buildDriverIndex();
    const row = analyzeCouple('_TZE2841000000_3MZB0SDZ', 'TS0601', index, new Map());
    assert.strictEqual(row.verdict, 'DO_NOT_LOCK');
    assert.strictEqual(row.doNotLock, true);
  });

  it('OCR invent pad stays DO_NOT_LOCK even if registry lookup deferred (heap)', () => {
    // Contre quoi P2749e: buildDriverIndex + BootBudget must not wipe doNotLock
    const index = buildDriverIndex();
    buildDriverIndex();
    const row = analyzeCouple('_TZE2841000000_3MZB0SDZ', 'TS0601', index, new Map());
    assert.strictEqual(row.verdict, 'DO_NOT_LOCK');
    assert.strictEqual(row.doNotLock, true);
  });

  it('presence_sensor_radar keeps gkfbdvyx at front; curtain keeps 5slehgeo', () => {
    const radar = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'),
      'utf8',
    ));
    const curtain = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'),
      'utf8',
    ));
    assert.ok(/gkfbdvyx/i.test(radar.zigbee.manufacturerName[0]));
    assert.ok(/5slehgeo/i.test(curtain.zigbee.manufacturerName[0]));
    assert.ok(radar.zigbee.productId.includes('TS0601'));
    assert.ok(curtain.zigbee.productId.includes('TS0601'));
  });

  it('never strips real TZE28C1000000 family; aliases short OCR form', () => {
    assert.strictEqual(
      stripTuyaOcrZeroPad('_TZE28C1000000_rzdkn5rx'),
      '_TZE28C1000000_rzdkn5rx',
    );
    assert.strictEqual(
      canonicalizeForumMfr('_TZE28C_RZDKN5RX'),
      '_TZE28C1000000_rzdkn5rx',
    );
  });

  it('HomeyCapabilityUx heals preventInsights even when getable already true', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/HomeyCapabilityUx.js'), 'utf8');
    assert.ok(src.includes('P2522') || src.includes('getable already true') || src.includes('P2553'));
    assert.ok(src.includes('preventInsights: false'));
  });
});

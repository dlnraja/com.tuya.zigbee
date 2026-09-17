'use strict';

/**
 * P2570 — Johan complementary enrich (handover) Contre quoi
 *
 * Contre quoi:
 * - enrich invents TS0601→generic_tuya
 * - tool missing / apply without ComplementaryMerge
 * - Johan DP library dropped from lib/tuya
 * - forum POST automation
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2570 Johan complementary enrich', () => {
  it('enrich script refuses invent + uses ComplementaryMerge', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/p2570-johan-complementary-enrich.js'), 'utf8');
    assert.ok(src.includes('ComplementaryMerge'));
    assert.ok(src.includes('refuse_ts0601_generic') || src.includes('refuseTs0601Generic'));
    assert.ok(src.includes('neverInventPid') || src.includes('Never invent'));
    assert.ok(src.includes('forumPost: false') || src.includes('never forum POST'));
    assert.ok(src.includes('appendExactIdentityForms'));
  });

  it('Johan DP + helpers libraries remain in runtime', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/tuya/TuyaDataPointsJohan.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/tuya/TuyaHelpersJohan.js')));
    const idx = fs.readFileSync(path.join(ROOT, 'lib/tuya/index.js'), 'utf8');
    assert.ok(idx.includes('TuyaDataPointsJohan'));
    assert.ok(idx.includes('TuyaHelpersJohan'));
  });

  it('ogx8u5z6 + m1cvyneb sacred placements intact after enrich', () => {
    const trv = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json'), 'utf8'));
    assert.ok((trv.zigbee.manufacturerName || []).some((m) => /ogx8u5z6/i.test(m)));
    assert.ok(!(trv.zigbee.endpoints?.['1']?.clusters || []).includes(6));
    const dim = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/driver.compose.json'), 'utf8'));
    assert.ok((dim.zigbee.manufacturerName || []).some((m) => /m1cvyneb/i.test(m)));
  });
});

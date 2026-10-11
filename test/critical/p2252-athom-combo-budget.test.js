'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2252 — Athom processing_failed / socket hang up root cause
 * Raw manufacturerName×productId cartesian (CASE forms count).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const {
  compactManifestFile,
  comboCount,
  limitCaseForms,
} = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

const ROOT = path.join(__dirname, '..', '..');

describe('P2252 Athom zigbee combo budget', () => {
  it('limitCaseForms caps variants per unique mfr', () => {
    const out = limitCaseForms(['HOBEIAN', 'hobeian', 'Hobeian', 'HOBEIAN'], 2);
    assert.ok(out.length <= 2);
    assert.ok(out.includes('HOBEIAN') || out.includes('hobeian'));
  });

  it('compact enforces RAW afterTotal ≤ maxTotal (not unique-case lie)', () => {
    const tmp = path.join(os.tmpdir(), `p2252-compact-${Date.now()}.json`);
    fs.copyFileSync(path.join(ROOT, 'app.json'), tmp);
    const result = compactManifestFile(tmp, {
      maxTotalCombos: 20000,
      maxDriverCombos: 2000,
      maxCaseForms: 2,
    });
    const manifest = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const raw = (manifest.drivers || []).reduce((s, d) => s + comboCount(d), 0);
    assert.strictEqual(result.afterTotal, raw, 'afterTotal must equal raw Athom cartesian');
    assert.ok(raw <= 20000, `raw ${raw} must be ≤ 20000`);
    assert.ok(!result.overTotalLimit);
    // climate must not keep 100k+ cartesian
    const climate = (manifest.drivers || []).find((d) => d.id === 'climate_sensor');
    if (climate) {
      assert.ok(comboCount(climate) <= 2000, `climate_sensor combos ${comboCount(climate)}`);
    }
    fs.unlinkSync(tmp);
  });

  it('auto-publish env uses Athom-safe combo caps', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    // WHY(8e9914e2ee): budgets were tightened (14000 / 1500) — accept any Athom-safe cap ≤ the old ceiling.
    const tot = Number((yml.match(/HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*"(\d+)"/) || [])[1]);
    const drv = Number((yml.match(/HOMEY_ZIGBEE_MAX_DRIVER_COMBOS:\s*"(\d+)"/) || [])[1]);
    assert.ok(tot > 0 && tot <= 20000, `total combos ${tot}`);
    assert.ok(drv > 0 && drv <= 2000, `driver combos ${drv}`);
    assert.ok(/HOMEY_DRAFT_WAIT_MS:\s*"(?:360000|600000)"/.test(yml));
  });
});

'use strict';

/**
 * P2607 — Autonomous Bastien → master/stable promote Contre quoi
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  isPromotable,
  isForbidden,
  classifyAutoSafe,
  isBothReliability,
  mergeComposeComplementary,
  mergeRegistryCases,
  mergeSacredKeep,
  FORBIDDEN_PATHS,
} = require('../../tools/ci/bastien-promote-upstream.js');

describe('P2607 Bastien autonomous promote', () => {
  it('forbids identity paths forever', () => {
    for (const p of ['.homeycompose/app.json', 'app.json', 'package.json', '.homeychangelog.json']) {
      assert.ok(FORBIDDEN_PATHS.includes(p));
      assert.strictEqual(isPromotable(p), false);
      assert.strictEqual(isForbidden(p), true);
      assert.strictEqual(classifyAutoSafe(p), false);
    }
  });

  it('AUTO_SAFE covers compose + registry + sacred-keep + tests + BOTH lib', () => {
    assert.ok(classifyAutoSafe('drivers/device_radiator_valve/driver.compose.json'));
    assert.ok(classifyAutoSafe('data/user-misattribution-registry.json'));
    assert.ok(classifyAutoSafe('config/architecture/publish-sacred-keep-couples.json'));
    assert.ok(classifyAutoSafe('test/critical/p2593-michaelp-ogx8u5z6-datapoint-tx.test.js'));
    assert.ok(classifyAutoSafe('lib/tuya/TuyaEF00Manager.js'));
    assert.ok(isBothReliability('lib/zigbee/Ef00OnlyInterview.js'));
    // Existing device.js overwrite is NOT auto-safe
    assert.strictEqual(classifyAutoSafe('drivers/device_radiator_valve/device.js'), false);
  });

  it('compose complementary merge never shrinks mfr/pid/caps', () => {
    const master = {
      zigbee: {
        manufacturerName: ['_TZE284_ogx8u5z6', '_tze284_ogx8u5z6'],
        productId: ['TS0601'],
        endpoints: { 1: { clusters: [0, 4, 5, 61184] } },
      },
      capabilities: ['target_temperature', 'measure_temperature'],
      settings: [{ id: 'temperature_calibration', type: 'number' }],
    };
    const bastien = {
      zigbee: {
        manufacturerName: ['_TZE204_ogx8u5z6'],
        productId: ['TS0601'],
        endpoints: { 1: { clusters: [0, 61184] } },
      },
      capabilities: ['measure_battery'],
      settings: [{ id: 'window_detection', type: 'checkbox' }],
    };
    const merged = mergeComposeComplementary(master, bastien);
    assert.ok(merged.zigbee.manufacturerName.includes('_TZE284_ogx8u5z6'));
    assert.ok(merged.zigbee.manufacturerName.includes('_tze284_ogx8u5z6'));
    assert.ok(merged.zigbee.manufacturerName.includes('_TZE204_ogx8u5z6'));
    assert.ok(merged.capabilities.includes('target_temperature'));
    assert.ok(merged.capabilities.includes('measure_battery'));
    assert.ok(merged.settings.some((s) => s.id === 'temperature_calibration'));
    assert.ok(merged.settings.some((s) => s.id === 'window_detection'));
  });

  it('registry + sacred-keep merge are additive by id/couple', () => {
    const reg = mergeRegistryCases(
      { version: 1, cases: [{ id: 'a', mfr: ['_X'] }] },
      { version: 1, cases: [{ id: 'a', mfr: ['_Y'] }, { id: 'b', mfr: ['_Z'] }] },
    );
    assert.strictEqual(reg.cases.length, 2);
    assert.deepStrictEqual(reg.cases[0].mfr, ['_X']);

    const keep = mergeSacredKeep(
      { couples: [{ mfr: '_A', pid: 'TS0601', driverId: 'd1' }] },
      {
        couples: [
          { mfr: '_A', pid: 'TS0601', driverId: 'd1' },
          { mfr: '_B', pid: 'TS0601', driverId: 'd2' },
        ],
      },
    );
    assert.strictEqual(keep.couples.length, 2);
  });

  it('promote workflow is autonomous (write + dual cron + stable job)', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/bastien-promote-upstream.yml'),
      'utf8',
    );
    assert.ok(yml.includes('contents: write'));
    assert.ok(yml.includes('shell: bash'));
    assert.ok(yml.includes('20 6 * * *'));
    assert.ok(yml.includes('20 18 * * *'));
    assert.ok(yml.includes('promote-stable-both'));
    assert.ok(yml.includes('--apply'));
    assert.ok(yml.includes('--commit'));
    assert.ok(yml.includes('check:p2607'));
    assert.ok(!/pull_request_target/.test(yml));
  });

  it('SSOT marks autonomous schedule', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/bastien-house-ssot.json'), 'utf8'),
    );
    assert.strictEqual(ssot.enrichment.direction, 'bastien_to_public_only');
    assert.ok(ssot.enrichment.autonomous === true || ssot.enrichment.schedule);
  });
});

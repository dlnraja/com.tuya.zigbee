'use strict';

/**
 * P2606 — Bastien house track Contre quoi
 * - Distinct App ID / version line
 * - One-way enrich doctrine (bastien → public only)
 * - Promote script never allows identity overwrite
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2606 Bastien house track', () => {
  it('SSOT locks private App ID + one-way direction', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/bastien-house-ssot.json'), 'utf8'),
    );
    assert.strictEqual(ssot.appId, 'com.dlnraja.tuya.zigbee.bastien');
    assert.strictEqual(ssot.branch, 'bastien-home');
    assert.strictEqual(ssot.enrichment.direction, 'bastien_to_public_only');
    assert.deepStrictEqual(ssot.enrichment.promotesTo, ['master', 'stable-v5']);
    assert.ok(ssot.enrichment.neverPullWholesaleFrom.includes('master'));
    assert.ok(ssot.identityNeverCopy.includes('appId'));
  });

  it('dual-app tracks register bastien without colliding public IDs', () => {
    const tracks = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-tracks.json'), 'utf8'),
    );
    assert.ok(tracks.tracks.bastien, 'tracks.bastien required');
    assert.strictEqual(tracks.tracks.bastien.appId, 'com.dlnraja.tuya.zigbee.bastien');
    assert.strictEqual(tracks.tracks.master.appId, 'com.dlnraja.tuya.zigbee');
    assert.strictEqual(tracks.tracks.stable.appId, 'com.dlnraja.tuya.zigbee.stable');
    assert.notStrictEqual(tracks.tracks.bastien.appId, tracks.tracks.master.appId);
    assert.notStrictEqual(tracks.tracks.bastien.appId, tracks.tracks.stable.appId);
  });

  it('promote helper forbids identity paths', () => {
    const { isPromotable, FORBIDDEN_PATHS } = require('../../tools/ci/bastien-promote-upstream.js');
    assert.ok(FORBIDDEN_PATHS.includes('app.json'));
    assert.ok(FORBIDDEN_PATHS.includes('.homeycompose/app.json'));
    assert.ok(FORBIDDEN_PATHS.includes('package.json'));
    assert.strictEqual(isPromotable('app.json'), false);
    assert.strictEqual(isPromotable('package.json'), false);
    assert.strictEqual(isPromotable('drivers/switch_1gang/device.js'), true);
    assert.strictEqual(isPromotable('data/user-misattribution-registry.json'), true);
  });

  it('doctrine + workflow exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/rules/BASTIEN_HOUSE_APP.md')));
    const md = fs.readFileSync(path.join(ROOT, 'docs/rules/BASTIEN_HOUSE_APP.md'), 'utf8');
    assert.ok(/bastien_to_public_only|one-way|jamais/i.test(md));
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/bastien-promote-upstream.yml'),
      'utf8',
    );
    assert.ok(yml.includes('defaults:'));
    assert.ok(yml.includes('shell: bash'));
    assert.ok(yml.includes('bastien-promote-upstream'));
    assert.ok(!/pull_request_target/.test(yml));
  });
});

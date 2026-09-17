'use strict';

/**
 * P2567 — 200 unbranded smart-feature vectors catalog + SoftRecipeRunner
 *
 * Contre quoi:
 * - catalog < 200
 * - commercial brand tokens in vector titles
 * - SoftRecipeRunner / hub not wired
 * - soft_feature_enable flow missing
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SoftFeatureCatalog = require(path.join(ROOT, 'lib/features/SoftFeatureCatalog.js'));
const SoftRecipeRunner = require(path.join(ROOT, 'lib/features/SoftRecipeRunner.js'));
const SmartGatewayFeatureHub = require(path.join(ROOT, 'lib/features/SmartGatewayFeatureHub.js'));

const FORBIDDEN = ['Philips', 'Hue', 'IKEA', 'Aqara', 'Lutron', 'SmartThings', 'Xiaomi', 'Dirigera', 'Tradfri'];

describe('P2567 Soft Feature 200 catalog', () => {
  it('has exactly or at least 200 vectors', () => {
    assert.ok(SoftFeatureCatalog.count() >= 200, `count=${SoftFeatureCatalog.count()}`);
    const snap = SoftFeatureCatalog.snapshot();
    assert.equal(snap.count, SoftFeatureCatalog.count());
    assert.ok(Object.keys(snap.byFamily).length >= 4);
  });

  it('titles are branding-free', () => {
    for (const v of SoftFeatureCatalog.all()) {
      const title = JSON.stringify(v.uiName || {});
      for (const bad of FORBIDDEN) {
        assert.ok(!title.includes(bad), `${v.id} title has ${bad}`);
      }
      assert.ok(v.id && v.recipe, `${v.id} missing recipe`);
    }
  });

  it('search finds path_light variants', () => {
    const hits = SoftFeatureCatalog.search('path_light');
    assert.ok(hits.length >= 5);
  });
});

describe('P2567 SoftRecipeRunner', () => {
  it('enables quiet_gate and night_bias recipes', () => {
    const app = {
      log: () => {},
      error: () => {},
      homeModeManager: { mode: 'night' },
      homey: { setInterval: () => 1, clearInterval: () => {}, drivers: { getDrivers: () => ({}) }, flow: { getTriggerCard: () => null } },
    };
    const hub = new SmartGatewayFeatureHub(app).start();
    const runner = new SoftRecipeRunner(hub);
    const q = runner.enable('quiet_hall_night', {});
    assert.equal(q.ok, true);
    const n = runner.apply('night_bias_35', { dim: 1 });
    // may need enable first
    runner.enable('night_bias_35', {});
    const n2 = runner.apply('night_bias_35', { dim: 1 });
    assert.ok(n2.dim < 1);
    assert.ok(hub.softFeatureCount() >= 200);
    hub.stop();
  });

  it('app.js wires soft_feature_enable', () => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(appJs.includes('soft_feature_enable'));
    assert.ok(appJs.includes('soft_feature_count_is'));
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/actions/soft_feature_enable.json')));
  });
});

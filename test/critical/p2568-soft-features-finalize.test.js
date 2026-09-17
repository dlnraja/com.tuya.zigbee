'use strict';

/**
 * P2568 — Soft Feature 200 vectors finalized end-to-end
 *
 * Contre quoi:
 * - broken alias targets (module names ≠ vector ids)
 * - stub recipe types returning only declarative_ready
 * - enableAll / family / disable / is_enabled unwired
 * - catalog vectors that fail enable()
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SoftFeatureCatalog = require(path.join(ROOT, 'lib/features/SoftFeatureCatalog.js'));
const SoftRecipeRunner = require(path.join(ROOT, 'lib/features/SoftRecipeRunner.js'));
const SmartGatewayFeatureHub = require(path.join(ROOT, 'lib/features/SmartGatewayFeatureHub.js'));
const { MODULE_ALIASES, HANDLED_TYPES } = SoftRecipeRunner;

function mockApp() {
  return {
    log: () => {},
    error: () => {},
    homeModeManager: {
      mode: 'night',
      on() { /* no-op EventEmitter soft */ },
    },
    solarElevation: { getElevation: () => 5 },
    homey: {
      setInterval: () => 1,
      clearInterval: () => {},
      setTimeout: (fn) => { try { fn(); } catch (_e) { /* */ } return 1; },
      drivers: { getDrivers: () => ({}) },
      flow: { getTriggerCard: () => null, getActionCard: () => ({ registerRunListener() {} }), getConditionCard: () => ({ registerRunListener() {} }) },
    },
  };
}

describe('P2568 Soft Feature finalize', () => {
  it('resolves every catalog recipe to a handled type', () => {
    const types = new Set();
    for (const v of SoftFeatureCatalog.all()) {
      const r = SoftRecipeRunner.resolveRecipe(v.recipe);
      assert.ok(r && r.type, `${v.id} unresolved`);
      assert.ok(HANDLED_TYPES.has(r.type), `${v.id} type=${r.type} not handled`);
      types.add(r.type);
    }
    assert.ok(types.size >= 10, `resolved types=${types.size}`);
  });

  it('MODULE_ALIASES covers all wired alias targets', () => {
    for (const v of SoftFeatureCatalog.all()) {
      if (v.recipe?.type !== 'alias') continue;
      const t = String(v.recipe.target || '');
      assert.ok(MODULE_ALIASES[t] || SoftFeatureCatalog.byId(t), `missing alias map for ${v.id}→${t}`);
    }
    assert.ok(Object.keys(MODULE_ALIASES).length >= 20);
  });

  it('enable() succeeds for all 200 vectors (empty device pool)', () => {
    const hub = new SmartGatewayFeatureHub(mockApp()).start();
    const runner = hub.recipes;
    assert.ok(runner);
    let ok = 0;
    for (const v of SoftFeatureCatalog.all()) {
      const res = runner.enable(v.id, {});
      assert.equal(res.ok, true, `${v.id} enable failed: ${JSON.stringify(res)}`);
      assert.ok(res.applied?.ok !== false, `${v.id} apply not ok`);
      ok += 1;
    }
    assert.equal(ok, SoftFeatureCatalog.count());
    assert.equal(runner.enabledIds().length, SoftFeatureCatalog.count());
    hub.stop();
  });

  it('enableAll + family + disable + isEnabled round-trip', () => {
    const hub = new SmartGatewayFeatureHub(mockApp()).start();
    const all = hub.enableAllSoftFeatures({}, { apply: false });
    assert.equal(all.enabled, 200);
    assert.equal(hub.isSoftFeatureEnabled('path_light_hall'), true);
    assert.equal(hub.disableSoftFeature('path_light_hall'), true);
    assert.equal(hub.isSoftFeatureEnabled('path_light_hall'), false);
    const fam = hub.enableSoftFeatureFamily('energy', {}, { apply: false });
    assert.ok(fam.enabled >= 1);
    hub.stop();
  });

  it('path_light / house_mode / lived_in / lux_gate apply concretely', () => {
    const hub = new SmartGatewayFeatureHub(mockApp()).start();
    const r = hub.recipes;
    const p = r.enable('path_light_hall', {});
    assert.equal(p.applied.type, 'path_light');
    assert.ok(p.applied.zone === 'hall');
    const h = r.enable('mode_night_path_dim', {});
    assert.equal(h.applied.type, 'house_mode_hook');
    const l = r.enable('lived_in_evening', { forceAway: true });
    assert.equal(l.applied.type, 'lived_in_window');
    const g = r.enable('lux_gate_below_200', { lux: 50 });
    assert.equal(g.applied.pass, true);
    hub.stop();
  });

  it('flow cards + app.js wire finalize actions', () => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    for (const id of [
      'soft_feature_enable',
      'soft_feature_disable',
      'soft_feature_enable_family',
      'soft_feature_enable_all',
      'soft_feature_is_enabled',
      'soft_feature_count_is',
    ]) {
      assert.ok(appJs.includes(id), `app.js missing ${id}`);
    }
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/actions/soft_feature_enable_all.json')));
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/conditions/soft_feature_is_enabled.json')));
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const actionIds = new Set((appJson.flow?.actions || []).map((x) => x.id));
    assert.ok(actionIds.has('soft_feature_enable_all'));
    assert.ok(actionIds.has('soft_feature_disable'));
  });
});

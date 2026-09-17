'use strict';

/**
 * P2564 — Full Homey-feasible gateway smart features
 *
 * Contre quoi:
 * - Soft Daylight missing continuous auto / dawn / dusk helpers
 * - Lamp Mesh occupancy only cross-variance (no baseline/activity/PIR fusion)
 * - Entertainment RGB flood instead of rate-limited Soft Ambient Sync
 * - SSOT still marks lamp_mesh as partial / entertainment as skip-only
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SoftDaylightFade = require(path.join(ROOT, 'lib/features/SoftDaylightFade.js'));
const LampMeshOccupancy = require(path.join(ROOT, 'lib/features/LampMeshOccupancy.js'));
const SoftAmbientSync = require(path.join(ROOT, 'lib/features/SoftAmbientSync.js'));
const SmartGatewayFeatureHub = require(path.join(ROOT, 'lib/features/SmartGatewayFeatureHub.js'));

describe('P2564 Soft Daylight full', () => {
  it('exposes auto + dawn + dusk APIs', () => {
    assert.equal(typeof SoftDaylightFade.enableAuto, 'function');
    assert.equal(typeof SoftDaylightFade.disableAuto, 'function');
    assert.equal(typeof SoftDaylightFade.startDawnRamp, 'function');
    assert.equal(typeof SoftDaylightFade.startDuskFade, 'function');
  });

  it('dawn plan rises from near-zero dim', () => {
    const plan = SoftDaylightFade.planFade({
      minutes: 5,
      steps: 10,
      fromDim: 0.01,
      fromTemperature: 0.9,
      toDim: 0.8,
      toTemperature: 0.3,
    });
    assert.ok(plan.steps[0].dim < 0.2);
    assert.ok(plan.steps[plan.steps.length - 1].dim > 0.7);
  });
});

describe('P2564 Lamp Mesh full_soft fusion', () => {
  it('fuseScores weights motion + radio + disturb', () => {
    const idle = LampMeshOccupancy.fuseScores({ radio: 0, disturb: 0, activity: 0, motion: 0, presence: 0 });
    const hot = LampMeshOccupancy.fuseScores({ radio: 0.6, disturb: 0.7, activity: 0.4, motion: 1, presence: 0.5 });
    assert.equal(idle, 0);
    assert.ok(hot > 0.55);
    assert.ok(hot <= 1);
  });

  it('enrollSensors merges into zone', () => {
    const fakeHomey = { setInterval: () => 1, clearInterval: () => {} };
    const mesh = new LampMeshOccupancy({ homey: fakeHomey }, { minLights: 1 });
    mesh.enrollZone('lab', [{ getName: () => 'L1', hasCapability: () => false, getStoreValue: () => -60 }]);
    mesh.enrollSensors('lab', [{ getName: () => 'PIR', hasCapability: (c) => c === 'alarm_motion', getCapabilityValue: () => true }]);
    const snap = mesh.snapshot();
    assert.equal(snap.zones.lab.sensorCount, 1);
    assert.equal(snap.zones.lab.lightCount, 1);
    mesh.destroy();
  });
});

describe('P2564 Soft Ambient Sync (no flood)', () => {
  it('rate-limits updates and caps lights', () => {
    const timers = [];
    const fakeHomey = {
      setInterval: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
      clearInterval: () => {},
    };
    const sync = new SoftAmbientSync({ homey: fakeHomey }, { maxLights: 4, minIntervalMs: 2000 });
    const mk = (name) => ({
      getName: () => name,
      getData: () => ({ id: name }),
      hasCapability: () => true,
      getCapabilityValue: () => 0.2,
      setCapabilityValue: async () => {},
    });
    const lights = [mk('a'), mk('b'), mk('c'), mk('d'), mk('e')];
    const r1 = sync.apply(lights, { hue: 0.1, saturation: 0.5, dim: 0.4 }, { force: true });
    assert.equal(r1.applied, 4);
    assert.equal(r1.skipped, null);
    const r2 = sync.apply(lights, { hue: 0.2 }, { force: false });
    assert.equal(r2.applied, 0);
    assert.equal(r2.skipped, 'rate_limit');
    sync.destroy();
  });
});

describe('P2564 hub + SSOT + wiring', () => {
  it('hub exposes auto fade + ambient + mesh', () => {
    const app = {
      log: () => {},
      error: () => {},
      homey: { setInterval: () => 1, clearInterval: () => {}, flow: { getTriggerCard: () => null } },
      solarElevation: null,
    };
    const hub = new SmartGatewayFeatureHub(app).start();
    assert.ok(hub.mesh);
    assert.ok(hub.ambient);
    assert.equal(typeof hub.enableSoftDaylightAuto, 'function');
    assert.equal(typeof hub.applySoftAmbient, 'function');
    hub.stop();
  });

  it('world SSOT marks full / full_soft (no partial lamp_mesh, no skip entertainment)', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/world-zigbee-smart-features-ssot.json'),
      'utf8',
    ));
    const byId = Object.fromEntries(ssot.gatewayConcepts.map((c) => [c.genericId, c]));
    assert.equal(byId.soft_daylight_fade.feasibilityOnHomey, 'full');
    assert.equal(byId.dawn_dusk.feasibilityOnHomey, 'full');
    assert.equal(byId.lamp_mesh_occupancy.feasibilityOnHomey, 'full_soft');
    assert.equal(byId.soft_ambient_sync.feasibilityOnHomey, 'full_soft');
    assert.ok(!byId.entertainment_stream);
    assert.ok(ssot.homeyImplementations.softAmbientSync.includes('SoftAmbientSync'));
  });

  it('flow compose cards for auto / ambient / mesh condition exist branding-free', () => {
    const files = [
      '.homeycompose/flow/actions/soft_daylight_fade_enable_auto.json',
      '.homeycompose/flow/actions/soft_ambient_sync_apply.json',
      '.homeycompose/flow/actions/lamp_mesh_occupancy_auto_enroll.json',
      '.homeycompose/flow/conditions/lamp_mesh_zone_is_occupied.json',
    ];
    for (const rel of files) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      const blob = JSON.stringify(j);
      assert.ok(!blob.includes('Philips'));
      assert.ok(!blob.includes('TruTone'));
      assert.ok(!blob.includes('MotionAware'));
      assert.ok(!blob.includes('Ambilight'));
    }
  });

  it('app.js wires Dawn/Dusk SoftDaylightFade + Soft Ambient + mesh condition', () => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(appJs.includes('startDawnRamp'));
    assert.ok(appJs.includes('startDuskFade'));
    assert.ok(appJs.includes('soft_ambient_sync_apply'));
    assert.ok(appJs.includes('lamp_mesh_zone_is_occupied'));
    assert.ok(appJs.includes('soft_daylight_fade_enable_auto'));
  });
});

'use strict';

/**
 * P2563 — World Zigbee smart-gateway cartography + Soft Daylight Fade + Lamp Mesh Occupancy
 *
 * Contre quoi:
 * - commercial UI tokens (Hue/Philips/TruTone/MotionAware) in flow titles
 * - SoftDaylightFade jumps without multi-step ease plan
 * - Lamp Mesh Occupancy enroll without ≥2 lights / hub missing
 * - MASTER_ONLY hub not wired from world SSOT
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SoftDaylightFade = require(path.join(ROOT, 'lib/features/SoftDaylightFade.js'));
const LampMeshOccupancy = require(path.join(ROOT, 'lib/features/LampMeshOccupancy.js'));
const SmartGatewayFeatureHub = require(path.join(ROOT, 'lib/features/SmartGatewayFeatureHub.js'));

const FORBIDDEN = [
  'Hue', 'Philips', 'Signify', 'TruTone', 'True Tone', 'MotionAware',
  'SpaceSense', 'Ambilight', 'Adaptive Lighting',
];

describe('P2563 Soft Daylight Fade', () => {
  it('planFade returns eased multi-step CCT/dim toward atmosphere', () => {
    const plan = SoftDaylightFade.planFade({
      minutes: 10,
      steps: 10,
      fromDim: 0.2,
      fromTemperature: 0.9,
      date: new Date('2026-06-21T12:00:00Z'),
    });
    assert.ok(plan.steps.length >= 4);
    assert.ok(plan.stepMs > 0);
    assert.ok(plan.target.kelvin > 2000);
    const first = plan.steps[0];
    const last = plan.steps[plan.steps.length - 1];
    assert.ok(Math.abs(last.temperature - plan.target.temperature) < 0.02);
    assert.ok(first.progress < last.progress);
  });
});

describe('P2563 Lamp Mesh Occupancy', () => {
  it('enrollZone stores lights and requires soft threshold', () => {
    const fakeHomey = {
      setInterval: () => 1,
      clearInterval: () => {},
    };
    const mesh = new LampMeshOccupancy({ homey: fakeHomey }, { minLights: 2, threshold: 0.42 });
    const lightA = { getName: () => 'A', hasCapability: () => false, getStoreValue: () => -55 };
    const lightB = { getName: () => 'B', hasCapability: () => false, getStoreValue: () => -58 };
    const res = mesh.enrollZone('living', [lightA, lightB]);
    assert.equal(res.zoneId, 'living');
    assert.equal(res.lightCount, 2);
    const snap = mesh.snapshot();
    assert.equal(snap.zones.living.lightCount, 2);
    mesh.destroy();
  });

  it('SmartGatewayFeatureHub exposes fade + mesh APIs', () => {
    const app = {
      log: () => {},
      error: () => {},
      homey: { setInterval: () => 1, clearInterval: () => {}, flow: { getTriggerCard: () => null } },
      solarElevation: null,
    };
    const hub = new SmartGatewayFeatureHub(app).start();
    assert.ok(hub.mesh);
    const atmosphere = hub.computeAtmosphere({ date: new Date('2026-06-21T12:00:00Z') });
    assert.ok(atmosphere.kelvin > 2000);
    hub.stop();
  });
});

describe('P2563 branding-free cartography + wiring', () => {
  it('world SSOT maps commercial concepts to generic modules', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/world-zigbee-smart-features-ssot.json'),
      'utf8',
    ));
    assert.equal(ssot.classify, 'MASTER_ONLY');
    assert.ok(ssot.policy.brandingFreeUi);
    const ids = ssot.gatewayConcepts.map((c) => c.genericId);
    assert.ok(ids.includes('soft_daylight_fade'));
    assert.ok(ids.includes('lamp_mesh_occupancy'));
    assert.ok(ssot.homeyImplementations.hub.includes('SmartGatewayFeatureHub'));
  });

  it('flow compose cards are branding-free and exist', () => {
    const files = [
      '.homeycompose/flow/actions/soft_daylight_fade_start.json',
      '.homeycompose/flow/actions/soft_daylight_fade_stop.json',
      '.homeycompose/flow/actions/lamp_mesh_occupancy_enroll.json',
      '.homeycompose/flow/triggers/lamp_mesh_occupancy_changed.json',
    ];
    for (const rel of files) {
      const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const j = JSON.parse(raw);
      assert.ok(j.id);
      const blob = JSON.stringify(j.title || {}) + JSON.stringify(j.hint || {});
      for (const bad of FORBIDDEN) {
        assert.ok(!blob.includes(bad), `${rel} must not contain "${bad}"`);
      }
    }
  });

  it('app.js wires hub + Soft Daylight / Lamp Mesh flow cards', () => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(appJs.includes('SmartGatewayFeatureHub'));
    assert.ok(appJs.includes('soft_daylight_fade_start'));
    assert.ok(appJs.includes('lamp_mesh_occupancy_enroll'));
    assert.ok(appJs.includes('_registerSmartGatewayFlowCards'));
  });

  it('MotionAware logs rebranded to MeshPresence', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/detectors/MotionAwarePresenceDetector.js'),
      'utf8',
    );
    assert.ok(src.includes('[MeshPresence]'));
    assert.ok(!src.includes('[MotionAware]'));
  });

  it('smart-features-ssot catalogs soft_daylight_fade + lamp_mesh_occupancy', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/smart-features-ssot.json'),
      'utf8',
    ));
    const ids = ssot.catalog.map((c) => c.id);
    assert.ok(ids.includes('soft_daylight_fade'));
    assert.ok(ids.includes('lamp_mesh_occupancy'));
    assert.ok(ssot.policy.forbiddenUiTokens.includes('MotionAware'));
    assert.ok(ssot.policy.forbiddenUiTokens.includes('TruTone'));
  });
});

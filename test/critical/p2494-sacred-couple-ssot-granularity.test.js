'use strict';

/**
 * P2494 — Contre quoi: agents/bots forget the app is couple-native
 * (manufacturerName + productId). mfs multi-pid under one mfr is NORMAL.
 * Never invent pid; never mfr-only route when pid known.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  normalizeSacredCouple,
  isValidSacredCouple,
} = require('../../tools/ci/sacred-couple-pair');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2494 sacred-couple SSOT granularity', () => {
  it('SSOT + human doc + smart-map identity exist', () => {
    for (const rel of [
      'config/architecture/sacred-couple-ssot.json',
      'docs/architecture/SACRED_COUPLE_SSOT.md',
      'config/architecture/project-smart-map.json',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
    const map = readJson('config/architecture/project-smart-map.json');
    assert.equal(map.identity.ssot, 'config/architecture/sacred-couple-ssot.json');
    assert.equal(map.identity.settingsKeys.mfr, 'zb_manufacturer_name');
    assert.equal(map.identity.settingsKeys.pid, 'zb_model_id');
    assert.match(String(map.identity.mfs), /multi-pid|many modelIds/i);
  });

  it('SSOT encodes mfs multi-pid doctrine + decision tree', () => {
    const ssot = readJson('config/architecture/sacred-couple-ssot.json');
    assert.ok(ssot.mfsDoctrine?.allowed?.length >= 3);
    assert.ok(ssot.mfsDoctrine?.forbidden?.some((x) => /invent/i.test(x)));
    assert.ok(ssot.decisionTree?.length >= 4);
    assert.ok(ssot.lookupOrder?.length >= 5);
    assert.ok(ssot.highRiskLocks?.length >= 6);
    assert.ok(ssot.multiVariantExamples?.some((e) => e.brand === 'HOBEIAN'));
  });

  it('high-risk locks are full couples (mfr+pid+driver)', () => {
    const ssot = readJson('config/architecture/sacred-couple-ssot.json');
    for (const row of ssot.highRiskLocks) {
      assert.ok(row.mfr && row.pid && row.driver, JSON.stringify(row));
      assert.ok(isValidSacredCouple(row.mfr, row.pid), `invalid couple ${row.mfr}+${row.pid}`);
      const n = normalizeSacredCouple(row.mfr, row.pid);
      assert.ok(n?.key);
    }
    // Contre quoi: TS004F / TS011F letter suffix must validate (knobs, plugs)
    assert.ok(isValidSacredCouple('_TZ3000_uri7ongn', 'TS004F'));
    assert.ok(isValidSacredCouple('_TZ3000_okaz9tjs', 'TS011F'));
    assert.ok(isValidSacredCouple('_TZ3210_iystcadi', 'TS0505B'));
  });

  it('HOBEIAN multi-pid examples stay distinct drivers', () => {
    const ssot = readJson('config/architecture/sacred-couple-ssot.json');
    const h = ssot.multiVariantExamples.find((e) => e.brand === 'HOBEIAN');
    const byPid = Object.fromEntries(h.couples.map((c) => [c.pid, c.driver]));
    assert.equal(byPid['ZG-227Z'], 'climate_sensor');
    assert.equal(byPid['ZG-303Z'], 'soil_sensor');
    assert.equal(byPid['ZG-305Z'], 'switch_2gang');
    assert.notEqual(byPid['ZG-227Z'], byPid['ZG-303Z']);
  });

  it('TS0601 alone is not enough — m1cvyneb vs clrdrnya vs icka1clh', () => {
    const ssot = readJson('config/architecture/sacred-couple-ssot.json');
    const tuya = ssot.multiVariantExamples.find((e) => /TS0601/i.test(e.brand));
    const drivers = new Set(tuya.couples.map((c) => c.driver));
    assert.ok(drivers.has('wall_dimmer_tuya'));
    assert.ok(drivers.has('presence_sensor_radar'));
    assert.ok(drivers.has('curtain_motor'));
    assert.ok(drivers.size >= 3);
  });

  it('failover SSOT users expose couple objects (mfr+pid)', () => {
    const fo = readJson('config/architecture/forum-complementary-failover-ssot.json');
    assert.equal(fo.coupleSsot, 'config/architecture/sacred-couple-ssot.json');
    for (const [name, u] of Object.entries(fo.users)) {
      assert.ok(u.couple?.mfr && u.couple?.pid, `${name} missing couple object`);
      assert.ok(u.coupleKey?.includes('+'), `${name} coupleKey`);
      assert.ok(u.driver, `${name} driver`);
    }
  });

  it('button UI charter couple examples map roles', () => {
    const ui = readJson('config/architecture/homey-button-ui-charter-ssot.json');
    assert.ok(ui.identityRule?.examples?.length >= 4);
    const peter = ui.identityRule.examples.find((e) => /mrpevh8p/i.test(e.couple));
    assert.equal(peter.role, 'scene');
    const knob = ui.identityRule.examples.find((e) => /uri7ongn/i.test(e.couple));
    assert.equal(knob.role, 'knob');
    const sceneKnob = ui.identityRule.examples.find((e) => /kaflzta4/i.test(e.couple));
    assert.equal(sceneKnob.role, 'scene');
  });

  it('HomeyButtonUiCharter resolves role from couple settings', () => {
    const { resolveUiRole } = require('../../lib/utils/HomeyButtonUiCharter');
    const device = {
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_uri7ongn'
        : k === 'zb_model_id' ? 'TS004F' : null),
      driver: { id: 'smart_knob', manifest: { class: 'button' } },
    };
    assert.equal(resolveUiRole(device), 'knob');
    const scene = {
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_kaflzta4'
        : k === 'zb_model_id' ? 'TS004F' : null),
      driver: { id: 'smart_knob', manifest: { class: 'button' } },
    };
    assert.equal(resolveUiRole(scene), 'scene');
  });

  it('WHY + device-truth rules point at P2494 couple SSOT', () => {
    // WHY(P2497): .cursor/rules is IDE-local — may be absent on thinner stable clones
    const whyPath = path.join(ROOT, '.cursor/rules/why-interrogation.mdc');
    const dtPath = path.join(ROOT, '.cursor/rules/device-truth.mdc');
    if (!fs.existsSync(whyPath) || !fs.existsSync(dtPath)) {
      // Contre quoi still locked via SSOT + human docs above
      assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/SACRED_COUPLE_SSOT.md')));
      return;
    }
    const why = fs.readFileSync(whyPath, 'utf8');
    assert.match(why, /Quel couple/i);
    assert.match(why, /sacred-couple-ssot/);
    const dt = fs.readFileSync(dtPath, 'utf8');
    assert.match(dt, /check:p2494|sacred-couple-ssot/);
  });
});

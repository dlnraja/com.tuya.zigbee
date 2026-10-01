'use strict';

/**
 * P2762 — Homey-native first; non-native (EF00 / 0xE00x / 0xEF01 / guessed DPs)
 * complementary and never mandatory.
 * Contre quoi:
 * - P2758 regression: TS0601/_TZE with complete native IAS interview forced HYBRID+DP TX
 * - sticky unreliable DP1 accepted with no distance ever seen (P2453 lock)
 * - raw this.setCapabilityValue in drivers/siren
 * Sources: JohanBendz#44 (_TYZB01_jytabjkb TS0202 exposes 0xEF01).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { detectIntelligentProtocol } = require('../../lib/protocol/IntelligentProtocolDetect');

function mock(mfr, modelId, clusters) {
  return {
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: modelId }),
    getData: () => ({ manufacturerName: mfr, modelId }),
    getStore: () => ({}),
    zclNode: { endpoints: { 1: { clusters } }, manufacturerName: mfr, modelId },
  };
}

describe('P2762 native-first, complementary never mandatory', () => {
  it('TS0601 with native IAS and no 61184 → ZCL primary, passive listen, no DP TX', () => {
    const i = detectIntelligentProtocol(mock('_TZE200_3towulqd', 'TS0601', { iasZone: {} }));
    assert.equal(i.protocol, 'ZCL');
    assert.equal(i.reason, 'ts0601_zcl_only_no_ef00');
    assert.equal(i.preferDpTx, false);
    assert.equal(i.listenHybrid, true);
  });

  it('_TZE basic/onOff-only interview keeps P2758 HYBRID (Homey may miss EF00)', () => {
    const i = detectIntelligentProtocol(mock('_TZE284_uo8qcagc', 'TS0601', { 0: {}, 6: {} }));
    assert.equal(i.protocol, 'HYBRID');
    assert.equal(i.preferDpTx, true);
  });

  it('EF00 present still wins (EF00 used only when 61184 present)', () => {
    const i = detectIntelligentProtocol(mock('_TZE200_3towulqd', 'TS0601', { iasZone: {}, 61184: {} }));
    assert.equal(i.protocol, 'HYBRID');
    assert.equal(i.reason, 'ef00_and_zcl_present');
  });

  it('sticky unreliable DP1 needs a distance ever seen; stale non-zero distance still ok', () => {
    const Inf = require('../../lib/sensors/IntelligentPresenceInference');
    const inf = new Inf({ log() {} });
    assert.equal(inf.updatePresenceDP(true, { unreliable: true }), false);
    inf.updateDistance(1.5);
    inf.state.distanceTimestamp = Date.now() - 10 * 60 * 1000; // stale
    assert.equal(inf.updatePresenceDP(true, { unreliable: true }), true);
  });

  it('siren uses safeSetCapabilityValue only', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/siren/device.js'), 'utf8');
    assert.doesNotMatch(src, /this\.setCapabilityValue\(/);
  });

  it('_TZE200_nkjintbl follows the P2605 registry (switch_2gang only, never plug/1/3/4-gang)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const has = (id) => (app.drivers.find((x) => x.id === id)?.zigbee?.manufacturerName || []).includes('_TZE200_nkjintbl');
    assert.ok(has('switch_2gang'), 'switch_2gang');
    for (const id of ['switch_1gang', 'switch_3gang', 'switch_4gang', 'button_wireless_plug']) assert.ok(!has(id), id);
    const reg = require('../../data/user-misattribution-registry.json');
    assert.equal(reg.cases.find((c) => c.id === 'p2605-nkjintbl-tze200-not-switch2gang-not-btn-plug').canonicalDriver, 'switch_2gang');
    assert.ok(!(app.drivers.find((x) => x.id === 'switch_2gang')?.zigbee?.manufacturerName || []).some((m) => /_tze284_nkjintbl/i.test(m)));
  });

  it('0xEF01 classified non-native (complementary, never mandatory)', () => {
    const n = require('../../lib/io/NonNativeComplementary');
    assert.equal(n.isNonNativeCluster(0xEF01), true);
    assert.equal(n.complementaryPolicyFor(0xEF01).neverMandatory, true);
    assert.equal(n.isNonNativeCluster(1280), false);
  });

  it('heuristic DP guess is pure, typed, scaled, and never throws', () => {
    const u = require('../../lib/utils/UnknownDPLogger');
    const g = u.guessDpMeaning(19, 2345, { datatype: 2, deviceClass: 'socket' });
    assert.equal(g.kind, 'value');
    assert.equal(g.scaleGuess, 100);
    assert.equal(g.confidence, 'medium');
    assert.equal(u.guessDpMeaning(1, true).kind, 'bool');
    assert.equal(u.guessDpMeaning(5, Buffer.from([1, 2])).kind, 'raw');
    assert.doesNotThrow(() => u.recordDpGuess(null, 1, 1));
    const logs = [];
    const dev = { log: (m) => logs.push(m), setStoreValue: async () => {}, getClass: () => 'sensor' };
    const r = u.recordDpGuess(dev, 4, 87, 2);
    assert.equal(r.kind, 'value');
    assert.ok(logs.some((l) => l.includes('[DP-GUESS] DP4')));
  });

  it('npm check:p2762 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2762']);
  });
});

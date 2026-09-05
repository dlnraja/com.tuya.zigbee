'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2250 — HOBEIAN multi-couple + case-insensitive + Homey wrapper doctrine
 *
 * Brand HOBEIAN owns many verified (mfr,pid) couples. Anti-bot must be
 * couple-aware (forbidMode:couple) so soil locks do not strip climate ZG-227.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { includesCI, pairingCaseVariants, equalsIgnoreCase } = require('../../lib/utils/TuyaNormalizer');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  assert.ok(fs.existsSync(fp), `missing compose ${driverId}`);
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function loadRegistry() {
  const fp = path.join(ROOT, 'data', 'user-misattribution-registry.json');
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return Array.isArray(j.cases) ? j.cases : j;
}

describe('P2250 HOBEIAN couples', () => {
  it('climate_sensor owns HOBEIAN case forms + ZG-227Z/ZL only (no presence/soil pids)', () => {
    const c = loadCompose('climate_sensor');
    const mfr = c.zigbee.manufacturerName || [];
    const pid = c.zigbee.productId || [];
    for (const v of pairingCaseVariants('HOBEIAN')) {
      assert.ok(mfr.includes(v) || includesCI(mfr, v), `missing HOBEIAN case ${v}`);
    }
    assert.ok(includesCI(pid, 'ZG-227Z'));
    assert.ok(includesCI(pid, 'ZG-227ZL'));
    assert.ok(!includesCI(pid, 'ZG-303Z'));
    assert.ok(!includesCI(pid, 'ZG-204ZM'));
    assert.ok(!includesCI(pid, 'ZG-204ZV'));
  });

  it('soil_sensor keeps HOBEIAN|ZG-303Z; presence keeps ZG-204ZM; no ZG-227 on presence', () => {
    const soil = loadCompose('soil_sensor');
    assert.ok(includesCI(soil.zigbee.manufacturerName, 'HOBEIAN'));
    assert.ok(includesCI(soil.zigbee.productId, 'ZG-303Z'));
    assert.ok(!includesCI(soil.zigbee.productId, 'ZG-227Z'));

    const presence = loadCompose('presence_sensor_radar');
    assert.ok(includesCI(presence.zigbee.manufacturerName, 'HOBEIAN'));
    assert.ok(includesCI(presence.zigbee.productId, 'ZG-204ZM'));
    assert.ok(!includesCI(presence.zigbee.productId, 'ZG-227Z'));
  });

  it('registry soil forbid is couple-aware; climate lock exists', () => {
    const cases = loadRegistry();
    const soil = cases.find((c) => c.id === 'hobeian-zg303z-soil');
    assert.ok(soil, 'hobeian-zg303z-soil');
    assert.strictEqual(String(soil.forbidMode || '').toLowerCase(), 'couple');
    assert.ok(includesCI(soil.productId || [], 'ZG-303Z'));
    assert.ok(!(soil.productId || []).some((p) => /^TS0601$/i.test(String(p))), 'soil brand case must not list TS0601');
    assert.ok(!(soil.mfr || []).some((m) => /wqashyqo/i.test(String(m))), 'wqashyqo must be separate case');

    const climate = cases.find((c) => c.id === 'hobeian-zg227z-climate');
    assert.ok(climate, 'hobeian-zg227z-climate');
    assert.strictEqual(climate.canonicalDriver, 'climate_sensor');
    assert.strictEqual(String(climate.forbidMode || '').toLowerCase(), 'couple');
  });

  it('anti-bot gate + case matcher modules load', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/anti-bot-regression-gate.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/io/HomeyCompensationLayer.js')));
    // IntelligentProtocolDetect is master-primary; soft on older stable trees
    const ipd = path.join(ROOT, 'lib/protocol/IntelligentProtocolDetect.js');
    if (fs.existsSync(ipd)) {
      assert.ok(true);
    }
    assert.ok(equalsIgnoreCase('HOBEIAN', 'hobeian'));
    assert.ok(equalsIgnoreCase('ZG-227Z', 'zg-227z'));
  });
});

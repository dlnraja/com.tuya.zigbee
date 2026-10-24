'use strict';
// WHY: the critical suite also runs these files with `node --test` (no mocha globals) — same as p3017.
const { describe, it, beforeEach } = require('node:test');

// P3018 (master soak only): runtime wiring of the exact DP catalogue and passive endpoint layer.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const L = require('../../lib/utils/UnknownDPLogger');
const D = require('../../lib/zigbee/DpCatalogDecoder');

function mkDev(caps, seen = {}) {
  const set = [];
  return {
    set, _unknownDPs: seen,
    getSetting: (k) => ({ zb_manufacturer_name: '_TZE284_hodyryli', zb_model_id: 'TS0601' }[k]),
    getStoreValue: () => null, hasCapability: (c) => caps.includes(c),
    safeSetCapabilityValue: (c, v) => { set.push([c, v]); return Promise.resolve(); }, log() {},
  };
}

describe('P3018 master wiring', () => {
  beforeEach(() => D._resetForTests());
  it('autoMapUnknownDP: exact catalogue value on the FIRST sample (no 3-sample heuristic needed)', () => {
    const dev = mkDev(['measure_temperature']);
    assert.strictEqual(L.autoMapUnknownDP(dev, 1, 231), true);
    assert.deepStrictEqual(dev.set, [['measure_temperature', 23.1]]);
  });
  it('autoMapUnknownDP: a heuristic guess contradicting the catalogue is vetoed', () => {
    // DP17 = time_format for this couple → must not become alarm_motion
    const dev = mkDev(['alarm_motion'], { 17: { count: 5, vals: [] } });
    assert.strictEqual(L.autoMapUnknownDP(dev, 17, true), false);
    assert.deepStrictEqual(dev.set, []);
  });
  it('autoMapUnknownDP: unknown DP keeps the old heuristic path unchanged', () => {
    const dev = mkDev(['alarm_motion'], { 201: { count: 5, vals: [] } });
    assert.strictEqual(L.autoMapUnknownDP(dev, 201, true), true);
    assert.deepStrictEqual(dev.set, [['alarm_motion', true]]);
  });
  it('TuyaUnifiedDevice._handleDP consults the catalogue before the universal heuristics', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/TuyaUnifiedDevice.js'), 'utf8');
    const a = src.indexOf("DpCatalogDecoder').capabilityFor(this, dpId, value)");
    const b = src.indexOf('this._getUniversalDPMapping(dpId, value)');
    assert.ok(a > 0 && b > a);
    assert.match(src, /heuristicAllowed\(this, dpId, autoMapping\.capability\)/);
  });
  it('ClusterLayerAttach runs the passive endpoint layer last', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/zigbee/cluster/ClusterLayerAttach.js'), 'utf8');
    assert.match(src, /\['endpoints', \(\) => \{ require\('\.\.\/EndpointCoverage'\)\.attach\(device, zclNode\); \}\]/);
  });
});

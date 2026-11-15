'use strict';
// P3322 (CPU-limit diags b3f8c2c6 / b2e9ffe8): power_clamp_meter with no
// manufacturerName always took the '3phase' path, so every PJ-1203A burst was
// decoded as a 3-phase + fallback mix. P3298 only coalesced writes. The cause
// is the profile: when the mfr is missing, distinctive PJ-1203A DPs (114/115/
// 121/129/105) must lock the device onto the bidirectional 2-channel map.
// A known 3-phase manufacturer name still wins.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function device(mfr) {
  const D = require(path.join(ROOT, 'drivers/power_clamp_meter/device.js'));
  const caps = {};
  const logs = [];
  const d = Object.create(D.prototype);
  Object.assign(d, {
    getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : null),
    getStoreValue: () => null,
    hasCapability: () => true,
    getCapabilityValue: (k) => (caps[k] === undefined ? null : caps[k]),
    log: (...a) => logs.push(a.join(' ')),
    error: (...a) => logs.push('ERR ' + a.join(' ')),
    homey: { setTimeout: () => 1, clearTimeout() {} },
    _ctRatio: 1,
    _cachedMfr: mfr || '',
    _powerA: 0,
    _powerB: 0,
    safeSetCapabilityValue: async (cap, v) => { caps[cap] = v; return true; },
    _p3298RawSet: async (cap, v) => { caps[cap] = v; },
  });
  d.__caps = caps;
  d.__logs = logs;
  return d;
}

describe('P3322 power_clamp_meter learns PJ-1203A when the manufacturer name is missing', () => {
  it('empty mfr starts as 3phase, then locks to pj1203a after a distinctive DP', () => {
    const d = device('');
    assert.strictEqual(d.meterProfile, '3phase');
    d._handleDP(114, 1234);
    assert.strictEqual(d.meterProfile, 'pj1203a');
  });

  it('DP 115, 121, 129 and 105 also teach pj1203a when the mfr is missing', () => {
    for (const dp of [115, 121, 129, 105]) {
      const d = device('');
      d._handleDP(dp, dp === 129 ? 5 : 100);
      assert.strictEqual(d.meterProfile, 'pj1203a', `dp ${dp}`);
    }
  });

  it('a known 3-phase manufacturer stays 3phase even if a PJ-1203A-looking DP arrives', () => {
    const d = device('_TZE200_nslr42tt');
    assert.strictEqual(d.meterProfile, '3phase');
    d._handleDP(114, 1234);
    assert.strictEqual(d.meterProfile, '3phase');
  });

  it('a known PJ-1203A manufacturer stays pj1203a', () => {
    const d = device('_TZE204_81yrt3lo');
    assert.strictEqual(d.meterProfile, 'pj1203a');
    d._handleDP(18, 200);
    assert.strictEqual(d.meterProfile, 'pj1203a');
  });

  it('without a distinctive DP, an empty mfr does not invent pj1203a from DP 16 (phase 1 power)', () => {
    const d = device('');
    d._handleDP(16, 200);
    assert.strictEqual(d.meterProfile, '3phase');
  });
});

'use strict';

/**
 * P2395 — preferredLevels gates + mixin flag + physical_gang parity smoke
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const path = require('path');
const fs = require('fs');

describe('P2395 button capture preferredLevels + parity', () => {
  it('TS0041 preferred skips L7 EF00', () => {
    const {
      loadCascade,
      preferredLevels,
      applyPreferredLevelGates,
    } = require('../../lib/mixins/ButtonCaptureCascade');
    const cascade = loadCascade();
    const device = {
      getSetting: (k) => (k === 'zb_model_id' ? 'TS0041' : null),
      getStoreValue: () => null,
      getData: () => ({ manufacturerName: '_TZ3000_mrpevh8p' }),
    };
    const preferred = preferredLevels(device, cascade);
    applyPreferredLevelGates(device, preferred);
    assert.ok(!preferred.includes(7), 'TS0041 must not prefer L7');
    assert.strictEqual(device._skipCascadeL7Ef00, true);
    assert.strictEqual(device._buttonCaptureCascadeDone, true);
    assert.ok(Array.isArray(device._buttonCaptureLevelsApplied));
  });

  it('TS0601 preferred includes L7', () => {
    const {
      loadCascade,
      preferredLevels,
      applyPreferredLevelGates,
    } = require('../../lib/mixins/ButtonCaptureCascade');
    const device = {
      getSetting: (k) => (k === 'zb_model_id' ? 'TS0601' : null),
      getStoreValue: () => null,
      getData: () => ({}),
    };
    const preferred = preferredLevels(device, loadCascade());
    applyPreferredLevelGates(device, preferred);
    assert.ok(preferred.includes(7));
    assert.strictEqual(device._skipCascadeL7Ef00, false);
  });

  it('legacy switch_2_gang declares physical_gang cards', () => {
    const p = path.join(__dirname, '..', '..', 'drivers', 'switch_2_gang', 'driver.flow.compose.json');
    const flow = JSON.parse(fs.readFileSync(p, 'utf8'));
    const ids = new Set((flow.triggers || []).map((t) => t.id));
    assert.ok(ids.has('switch_2_gang_physical_gang1_on'));
    assert.ok(ids.has('switch_2_gang_physical_gang2_off'));
  });
});

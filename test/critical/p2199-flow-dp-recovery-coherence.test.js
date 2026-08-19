'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('P2199 flow / DP15 / recovery coherence', () => {
  it('never emits bare switch_Ngang physical flow IDs (driver-namespaced only)', () => {
    const { buildPhysicalFlowCandidates } = require('../../lib/flow/FlowCardHeuristics');
    const candidates = buildPhysicalFlowCandidates('air_purifier_switch', 1, 'on', {
      gangCount: 1,
      isButtonDevice: false,
    });
    const bareLegacy = candidates.filter((id) =>
      /^switch_\dgang_physical_/.test(id) && !id.startsWith('air_purifier_switch_')
    );
    assert.strictEqual(
      bareLegacy.length,
      0,
      `bare legacy IDs must not appear: ${bareLegacy.join(', ')}`
    );
    assert.ok(
      candidates.some((id) => id === 'air_purifier_switch_physical_on'),
      'driver-prefixed physical_on must remain'
    );
  });

  it('maps UnifiedSwitchBase DP15 to backlight_mode enum (not bool led_indicator)', () => {
    const source = read('lib/devices/UnifiedSwitchBase.js');
    assert.match(source, /setting:\s*'backlight_mode'/);
    assert.match(source, /DP15 = backlight enum/);
    assert.doesNotMatch(source, /setting:\s*'led_indicator'/);
    assert.match(source, /legacy→backlight/);
  });

  it('routes DataRecoveryManager writes through _safeSetCapability funnel', () => {
    const source = read('lib/tuya/DataRecoveryManager.js');
    assert.match(source, /async _safeSetCapability\(/);
    assert.match(source, /safeSetCapabilityValue/);
    const directWrites = (source.match(/this\.device\.setCapabilityValue\(/g) || []).length;
    assert.strictEqual(
      directWrites,
      1,
      'only _safeSetCapability fallback may call setCapabilityValue directly'
    );
  });
});

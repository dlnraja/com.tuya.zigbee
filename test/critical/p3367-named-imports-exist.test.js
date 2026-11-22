'use strict';

/**
 * P3367 - a named import of a local lib module must exist in that module's exports.
 * Contre quoi (stable-v5 since 383290373b, 2026-11-01):
 * - CapabilityCommandRouter imported endpointForCapability / isZclOnlyDevice that
 *   lib/utils/endpointCapability.js did not export: every UnifiedSwitchBase on/off
 *   threw "endpointForCapability is not a function" before sending a frame;
 * - findTuyaCluster was imported from lib/tuya/MagicPacketRegistry.js in four places
 *   without being exported.
 * The scan is a ratchet: the KNOWN list holds pre-existing cases still to triage and
 * may only shrink.
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const KNOWN = new Set([
  'lib/UniversalZigbeeDevice.js: getSafeCluster <- ./Util',
  'lib/devices/UnifiedSensorBase.js: // v5.5.143 <- ../tuya/TuyaUnifiedParser',
  'lib/mixins/ZigbeeHealthMixin.js: RadioSensingInference <- ../IntelligentSensorInference',
  'lib/smart/SmartCoordinator.js: SessionManager <- ../session/SessionManager',
  'lib/smart/SmartCoordinator.js: HealthMonitor <- ../health/HealthMonitor',
  'lib/smart/SmartCoordinator.js: SanityFilter <- ../filter/SanityFilter',
  'lib/utils/LifecycleCleanup.js: ZigbeeTimeout <- ../zigbee/ZigbeeTimeout',
]);

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p, out); } else if (p.endsWith('.js')) { out.push(p); }
  }
  return out;
}

function missingNamedImports() {
  const lib = path.join(ROOT, 'lib');
  const files = walk(lib).concat(fs.readdirSync(path.join(ROOT, 'drivers'))
    .map((d) => path.join(ROOT, 'drivers', d, 'device.js')).filter((f) => fs.existsSync(f)));
  const re = /const\s*\{([^}]+)\}\s*=\s*require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
  const bad = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src))) {
      let target;
      try { target = require.resolve(path.resolve(path.dirname(f), m[2])); } catch (_e) { continue; }
      if (!target.startsWith(lib)) { continue; }
      let mod;
      try { mod = require(target); } catch (_e) { continue; }
      if (!mod || (typeof mod !== 'object' && typeof mod !== 'function')) { continue; }
      for (const raw of m[1].split(',')) {
        const name = raw.split(':')[0].split('=')[0].trim();
        if (!name || name.startsWith('...')) { continue; }
        if (!(name in mod)) { bad.push(`${path.relative(ROOT, f)}: ${name} <- ${m[2]}`); }
      }
    }
  }
  return bad;
}

describe('P3367 named imports of local lib modules exist', function() {
  it('endpointCapability exports what CapabilityCommandRouter imports', function() {
    const ec = require('../../lib/utils/endpointCapability');
    for (const n of ['endpointForCapability', 'parseGangFromCapability', 'isZclOnlyDevice']) {
      assert.strictEqual(typeof ec[n], 'function', n);
    }
    assert.strictEqual(ec.endpointForCapability('onoff.gang3'), 3);
    assert.strictEqual(ec.endpointForCapability('onoff', { endpoint: 2 }), 2);
  });

  it('a plain ZCL on/off goes through the router without a TypeError', async function() {
    const { writeCapabilityWithFallbacks } = require('../../lib/zigbee/CapabilityCommandRouter');
    let sent = 0;
    const d = {
      gangCount: 1,
      zclNode: { endpoints: { 1: { clusters: { onOff: { setOn: async () => { sent++; }, setOff: async () => { sent++; } } } } } },
      getStoreValue() {}, setStoreValue: async () => {}, getSetting: () => null, getData: () => ({}), log() {},
    };
    const r = await writeCapabilityWithFallbacks(d, 'onoff', true, { endpoint: 1 });
    assert.strictEqual(r.ok, true);
    assert.ok(sent >= 1);
  });

  it('MagicPacketRegistry exports findTuyaCluster', function() {
    assert.strictEqual(typeof require('../../lib/tuya/MagicPacketRegistry').findTuyaCluster, 'function');
  });

  it('no new missing named import (ratchet)', function() {
    const fresh = missingNamedImports().filter((x) => !KNOWN.has(x));
    assert.deepStrictEqual(fresh, []);
  }).timeout(120000);
});

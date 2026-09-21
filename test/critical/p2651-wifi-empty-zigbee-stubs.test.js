'use strict';

/**
 * P2651 — WiFi drivers must not carry empty zigbee stubs
 *
 * Contre quoi (Homey validate publish):
 * manifest.drivers['wifi_*'].zigbee should have required property 'manufacturerName'
 * Empty `zigbee: {}` fails Athom publish-level validate.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

describe('P2651 wifi empty zigbee stubs', () => {
  it('no wifi_* compose has empty zigbee object', () => {
    const dirs = fs.readdirSync(DRIVERS).filter((d) => d.startsWith('wifi_'));
    const bad = [];
    for (const id of dirs) {
      const p = path.join(DRIVERS, id, 'driver.compose.json');
      if (!fs.existsSync(p)) continue;
      const j = JSON.parse(fs.readFileSync(p));
      if (j.zigbee && typeof j.zigbee === 'object' && Object.keys(j.zigbee).length === 0) {
        bad.push(id);
      }
    }
    assert.deepEqual(bad, [], `empty zigbee stubs: ${bad.join(', ')}`);
  });

  it('SwitchActuatorFlowAutoWire loads JSON via Buffer (no utf8 string)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/flow/SwitchActuatorFlowAutoWire.js'),
      'utf8',
    );
    assert.ok(!/JSON\.parse\(fs\.readFileSync\([^)]+,\s*['"]utf8['"]\)/.test(src));
    assert.ok(/JSON\.parse\(fs\.readFileSync\(composePath\)/.test(src));
  });
});

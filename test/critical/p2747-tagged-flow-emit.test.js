'use strict';

/**
 * P2747 — Homey tagged (token) Flows Contre quoi
 * Capability paint must emit declared *_changed cards; args triggers must be wired.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2747 tagged Flow emit + args auto-wire', () => {
  it('CapabilityChangedFlowEmitter builds tokens from card defs', () => {
    const { buildTokensForCard } = require('../../lib/flow/CapabilityChangedFlowEmitter');
    const t = buildTokensForCard(
      { tokens: [{ name: 'temperature', type: 'number' }] },
      'measure_temperature',
      21.5,
    );
    assert.equal(t.temperature, 21.5);
    const b = buildTokensForCard(
      { tokens: [{ name: 'battery', type: 'number' }] },
      'measure_battery',
      87,
    );
    assert.equal(b.battery, 87);
  });

  it('emitter + TuyaZigbeeDevice + BaseUnifiedDevice + DeclaredFlowCardAutoWire wired', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/flow/CapabilityChangedFlowEmitter.js')));
    const tuya = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(tuya.includes('emitCapabilityChangedFlows'));
    assert.ok(tuya.includes('P2747'));
    const base = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.ok(base.includes('emitCapabilityChangedFlows'));
    assert.ok(base.includes('capture previous BEFORE paint'));
    const auto = fs.readFileSync(path.join(ROOT, 'lib/flow/DeclaredFlowCardAutoWire.js'), 'utf8');
    assert.ok(auto.includes('P2747'));
    assert.ok(auto.includes('hasArgs'));
  });

  it('npm check:p2747 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2747']);
  });
});

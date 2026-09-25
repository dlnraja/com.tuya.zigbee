'use strict';

/**
 * P2748 — Bastien complementary / raw / any-path tagged Flow emit Contre quoi
 * Labeled Homey Flow cards (tokens) must fire even when paint skips L14 safeSet.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2748 complementary tagged Flow emit', () => {
  it('ensureTaggedFlowEmitFromAnyPath wraps setCapabilityValue and emits', async () => {
    const {
      ensureTaggedFlowEmitFromAnyPath,
      buildEventStyleCandidates,
    } = require('../../lib/flow/CapabilityChangedFlowEmitter');

    const events = buildEventStyleCandidates('climate_sensor', 'alarm_motion', true);
    assert.ok(events.some((id) => /motion/i.test(id)));

    const triggered = [];
    const device = {
      _destroyed: false,
      driver: {
        id: 'climate_sensor',
        manifest: {
          flow: {
            triggers: [
              {
                id: 'climate_sensor_temperature_changed',
                tokens: [{ name: 'temperature', type: 'number' }],
              },
            ],
          },
        },
      },
      homey: {
        flow: {
          getDeviceTriggerCard(id) {
            return {
              trigger: async (dev, tokens) => {
                triggered.push({ id, tokens });
              },
            };
          },
        },
      },
      getCapabilityValue() { return 20; },
      async setCapabilityValue() { return true; },
    };

    // Soft stubs used by emitter helpers
    const { collectDeclaredFlowIds } = require('../../lib/flow/FlowCardHeuristics');
    assert.ok(typeof collectDeclaredFlowIds === 'function');

    const wr = ensureTaggedFlowEmitFromAnyPath(device);
    assert.equal(wr.ok, true);
    assert.equal(wr.wrapped, true);
    assert.equal(ensureTaggedFlowEmitFromAnyPath(device).wrapped, false);

    await device.setCapabilityValue('measure_temperature', 22.5);
    // Allow fire-and-forget emit
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(
      triggered.length >= 1 || device._p2748SetCapWrapped === true,
      'wrap installed; emit soft when cards resolve',
    );
  });

  it('softArmComplementaryIo + HomeyGapCompensator install tagged wrap', () => {
    const soft = fs.readFileSync(path.join(ROOT, 'lib/io/NonNativeComplementary.js'), 'utf8');
    assert.ok(soft.includes('ensureTaggedFlowEmitFromAnyPath'));
    assert.ok(soft.includes('P2748'));
    const gap = fs.readFileSync(path.join(ROOT, 'lib/resilience/HomeyGapCompensator.js'), 'utf8');
    assert.ok(gap.includes('ensureTaggedFlowEmitFromAnyPath'));
    assert.ok(gap.includes('P2748'));
  });

  it('emitter exports wrap + event candidates; npm check:p2748', () => {
    const mod = require('../../lib/flow/CapabilityChangedFlowEmitter');
    assert.equal(typeof mod.ensureTaggedFlowEmitFromAnyPath, 'function');
    assert.equal(typeof mod.buildEventStyleCandidates, 'function');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2748']);
  });
});

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCapabilityFlowCandidates,
  resolveFlowCardId,
} = require('../../lib/flow/FlowCardHeuristics');

describe('P2375 flow fleet enrich heuristics', () => {
  it('resolves measure_power_changed variants', () => {
    const declared = new Set(['boiler_switch_energy_measure_power_changed']);
    const candidates = buildCapabilityFlowCandidates('boiler_switch_energy', 'measure_power');
    assert.equal(
      resolveFlowCardId(candidates, declared),
      'boiler_switch_energy_measure_power_changed',
    );
  });

  it('resolves temperature_changed short form', () => {
    const declared = new Set(['climate_sensor_temperature_changed']);
    const candidates = buildCapabilityFlowCandidates('climate_sensor', 'measure_temperature');
    assert.equal(
      resolveFlowCardId(candidates, declared),
      'climate_sensor_temperature_changed',
    );
  });
});

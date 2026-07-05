'use strict';

const assert = require('assert');

const ManufacturerDeviceQuirkRegistry = require('../../lib/helpers/ManufacturerDeviceQuirkRegistry');
const ProbabilisticDeviceDetector = require('../../lib/helpers/ProbabilisticDeviceDetector');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function ts0014Endpoints() {
  return {
    endpointDescriptors: [
      { endpointId: 1, applicationProfileId: 260, applicationDeviceId: 256, inputClusters: [0, 3, 4, 5, 6, 57344, 57345], outputClusters: [25, 10] },
      { endpointId: 2, applicationProfileId: 260, applicationDeviceId: 256, inputClusters: [3, 4, 5, 6, 57344, 57345], outputClusters: [] },
      { endpointId: 3, applicationProfileId: 260, applicationDeviceId: 256, inputClusters: [3, 4, 5, 6, 57344, 57345], outputClusters: [] },
      { endpointId: 4, applicationProfileId: 260, applicationDeviceId: 256, inputClusters: [3, 4, 5, 6, 57344, 57345], outputClusters: [] },
      { endpointId: 242, applicationProfileId: 41440, applicationDeviceId: 97, inputClusters: [], outputClusters: [33] },
    ],
    extendedEndpointDescriptors: {
      1: {
        clusters: {
          basic: {
            attributes: [
              { name: 'manufacturerName', value: '_TZ3000_mrduubod' },
              { name: 'modelId', value: 'TS0014' },
              { name: 'powerSource', value: 'battery' },
            ],
          },
        },
      },
    },
  };
}

function ts004fFourButtonEndpoints() {
  return {
    1: { clusters: { powerConfiguration: {}, onOff: {}, levelControl: {}, tuyaE000: { clusterId: 57344 } } },
    2: { clusters: { onOff: {}, levelControl: {}, tuyaE000: { clusterId: 57344 } } },
    3: { clusters: { onOff: {}, levelControl: {}, tuyaE000: { clusterId: 57344 } } },
    4: { clusters: { onOff: {}, levelControl: {}, tuyaE000: { clusterId: 57344 } } },
  };
}

function ts004fRotaryEndpoint() {
  return {
    endpointDescriptors: [
      {
        endpointId: 1,
        applicationProfileId: 260,
        applicationDeviceId: 2080,
        inputClusters: [0, 1, 3, 4, 6, 4096],
        outputClusters: [3, 4, 5, 6, 8, 10, 25, 768, 4096],
      },
    ],
  };
}

describe('manufacturer device quirk registry', () => {
  it('routes Moes TS0014 4-gang actuators to wall switch handling despite false battery hints', () => {
    const result = ProbabilisticDeviceDetector.detect({
      manufacturerName: '_TZ3000_mrduubod',
      modelId: 'TS0014',
      endpoints: ts0014Endpoints(),
    });

    assert.strictEqual(result.suggestedDriver, 'wall_switch_4gang_1way');
    assert.strictEqual(result.observed.endpointCount, 4);
    assert(result.evidenceBadges.includes('manufacturer_quirk_seen'));
    assert(result.evidenceBadges.includes('power_source_quirk_seen'));
    assert(result.observed.manufacturerQuirks.some(quirk => quirk.id === 'moes_ts0014_4gang_actuator_false_battery'));
    assert.strictEqual(result.manufacturerQuirks.powerSourceOverride, 'mains');

    const buttonCandidate = result.candidates.find(candidate => candidate.driver === 'button_wireless_4');
    assert(!buttonCandidate || buttonCandidate.contradictions.some(item => item.includes('manufacturer_quirk_penalty')));
  });

  it('uses the TS001x multi-endpoint OnOff signature for unknown manufacturer siblings', () => {
    const result = ProbabilisticDeviceDetector.detect({
      manufacturerName: '_TZ3000_new_moes_like',
      modelId: 'TS0014',
      endpoints: ts0014Endpoints(),
    });

    assert.strictEqual(result.suggestedDriver, 'wall_switch_4gang_1way');
    assert(result.confidence >= 75, `expected confident wall-switch route, got ${result.confidence}`);
    assert(result.observed.manufacturerQuirks.some(quirk => quirk.id === 'ts00xx_4gang_actuator_signature'));
  });

  it('keeps TS004F four-endpoint scene remotes on button_wireless_4 even without an exact manufacturer row', () => {
    const result = ProbabilisticDeviceDetector.detect({
      manufacturerName: '_TZ3000_new_4button_remote',
      modelId: 'TS004F',
      endpoints: ts004fFourButtonEndpoints(),
    });

    assert.strictEqual(result.suggestedDriver, 'button_wireless_4');
    assert(result.observed.manufacturerQuirks.some(quirk => quirk.id === 'ts004f_four_endpoint_scene_remote_signature'));
    assert(!result.candidates[0].contradictions.some(item => item.includes('manufacturer_quirk_penalty')));
  });

  it('routes one-endpoint TS004F rotary signatures away from 4-button remotes', () => {
    const result = ProbabilisticDeviceDetector.detect({
      manufacturerName: '_TZ3000_new_rotary_knob',
      modelId: 'TS004F',
      endpoints: ts004fRotaryEndpoint(),
    });

    assert.strictEqual(result.suggestedDriver, 'smart_knob_rotary');
    assert(result.observed.manufacturerQuirks.some(quirk => quirk.id === 'ts004f_single_endpoint_rotary_or_smart_button_signature'));

    const fourButtonCandidate = result.candidates.find(candidate => candidate.driver === 'button_wireless_4');
    assert(!fourButtonCandidate || fourButtonCandidate.contradictions.some(item => item.includes('manufacturer_quirk_penalty')));
  });

  it('keeps known TS004F one-button variants out of the 4-button driver', () => {
    const analysis = ManufacturerDeviceQuirkRegistry.analyze({
      manufacturerName: '_TZ3000_ja5osu5g',
      modelId: 'TS004F',
      endpoints: {
        1: { clusters: { powerConfiguration: {}, onOff: {}, tuyaE000: { clusterId: 57344 } } },
      },
    });

    assert(analysis.quirks.some(quirk => quirk.id === 'ts004f_known_one_button_variant'));
    const effect = ManufacturerDeviceQuirkRegistry.driverEffect(analysis, 'button_wireless_4');
    assert(effect.penalty >= 40);
  });
});

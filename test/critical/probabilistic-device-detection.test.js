'use strict';

const assert = require('assert');

const ProbabilisticDeviceDetector = require('../../lib/helpers/ProbabilisticDeviceDetector');
const UnknownDeviceHandler = require('../../lib/helpers/UnknownDeviceHandler');
const DriverMigrationManager = require('../../lib/managers/DriverMigrationManager');

function createHomeyLog() {
  return {
    messages: [],
    log(...args) {
      this.messages.push(args.join(' '));
    },
    error(...args) {
      this.messages.push(args.join(' '));
    }
  };
}

describe('probabilistic local device detection', function() {
  it('keeps exact compound fingerprints stronger than broad TS0601 product matches', function() {
    const result = ProbabilisticDeviceDetector.detect({
      manufacturerName: '_TZE284_0ints6wl',
      modelId: 'TS0601',
      endpoints: {
        1: { clusters: { tuya: { clusterId: 0xEF00 }, powerConfiguration: { clusterId: 0x0001 } } }
      },
      observedDps: { 3: 42, 5: 214, 15: 91 }
    });

    assert.strictEqual(result.suggestedDriver, 'soil_sensor');
    assert(result.confidence >= 85, `expected high confidence, got ${result.confidence}`);
    assert(result.candidates[0].sources.includes('compound_fingerprint_db'));
    assert(result.observed.dpIds.includes(15));
  });

  it('uses learned DP behavior to route unknown TS0601 variants toward the right family', function() {
    const result = ProbabilisticDeviceDetector.detect({
      manufacturerName: '_TZE200_probably_new',
      modelId: 'TS0601',
      endpoints: {
        1: { clusters: { tuya: { clusterId: 0xEF00 } } }
      },
      dpAutoDiscoveryReport: {
        profileRecommendation: {
          profileId: 'presence_sensor_radar',
          confidence: 88,
          observedCapabilities: ['alarm_motion', 'measure_luminance', 'target_distance'],
          observedTypes: ['presence_bool', 'lux_direct', 'distance']
        },
        dynamicDPMap: {
          1: { capability: 'alarm_motion', type: 'presence_bool', confidence: 82 },
          103: { capability: 'measure_luminance', type: 'lux_direct', confidence: 77 },
          9: { capability: 'target_distance', type: 'distance', confidence: 72 }
        }
      }
    });

    assert.strictEqual(result.suggestedDriver, 'presence_sensor_radar');
    assert(result.confidence >= 65, `expected useful confidence, got ${result.confidence}`);
    assert(result.evidenceBadges.includes('learning_report_seen'));
    assert(result.observed.capabilities.includes('target_distance'));
  });

  it('enriches UnknownDeviceHandler recommendations with ranked candidates', async function() {
    const homey = createHomeyLog();
    const handler = new UnknownDeviceHandler(homey);

    const analysis = await handler.analyzeDevice({
      manufacturerName: '_TZ3000_u3nv1jwk',
      modelId: 'TS004F',
      endpoints: {
        1: { clusters: { powerConfiguration: {}, onOff: {} } },
        2: { clusters: { onOff: {} } },
        3: { clusters: { onOff: {} } },
        4: { clusters: { onOff: {} } }
      }
    });

    assert.strictEqual(analysis.suggestedDriver, 'button_wireless_4');
    assert(analysis.probabilistic);
    assert(analysis.alternatives.length > 0);
    assert(analysis.matchedPatterns.some(pattern => pattern.startsWith('probabilistic:button_wireless_4')));
  });

  it('lets migration manager prefer a stronger probabilistic route', function() {
    const manager = new DriverMigrationManager(createHomeyLog());

    const best = manager.determineBestDriver({
      manufacturerName: '_TZE284_0ints6wl',
      modelId: 'TS0601',
      endpoints: {
        1: { clusters: { tuya: { clusterId: 0xEF00 }, powerConfiguration: { clusterId: 0x0001 } } }
      },
      observedDps: { 3: 60, 5: 210, 15: 90 }
    }, {
      deviceType: 'sensor',
      powerSource: 'battery',
      features: ['measure_temperature', 'measure_humidity', 'measure_battery']
    });

    assert.strictEqual(best.driverId, 'soil_sensor');
    assert(best.confidence >= 0.85);
    assert(best.reason.some(reason => reason.includes('probabilistic local detection')));
  });
});

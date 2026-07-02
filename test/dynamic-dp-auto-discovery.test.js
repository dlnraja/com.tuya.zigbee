'use strict';

/* global describe, it */

const assert = require('assert');
const { EventEmitter } = require('events');

const IntelligentDPAutoDiscovery = require('../lib/sensors/IntelligentDPAutoDiscovery');
const HelperDiscovery = require('../lib/helpers/IntelligentDPAutoDiscovery');
const IntelligentFrameAnalyzer = require('../lib/zigbee/IntelligentFrameAnalyzer');
const TuyaDPDataLogger = require('../lib/tuya/TuyaDPDataLogger');

function createDevice(capabilities = []) {
  const store = {};
  const caps = new Set(capabilities);
  const calls = {
    setCapability: [],
    addedCaps: [],
    buttons: [],
    logs: []
  };

  return {
    calls,
    homey: {
      flow: {
        getDeviceTriggerCard: () => ({
          trigger: async () => true
        })
      },
      setTimeout,
      clearTimeout
    },
    node: { modelId: 'TS0601' },
    zclNode: { endpoints: { 1: { clusters: {} } } },
    getData: () => ({ id: 'test-device', modelId: 'TS0601' }),
    getName: () => 'Universal Zigbee Device',
    setName: async name => { store.name = name; },
    log: (...args) => calls.logs.push(args.join(' ')),
    error: (...args) => calls.logs.push(args.join(' ')),
    getSetting: () => null,
    getStoreValue: key => store[key],
    setStoreValue: async (key, value) => { store[key] = value; },
    getCapabilities: () => [...caps],
    hasCapability: cap => caps.has(cap),
    addCapability: async cap => {
      caps.add(cap);
      calls.addedCaps.push(cap);
    },
    safeSetCapabilityValue: async (cap, value) => {
      caps.add(cap);
      calls.setCapability.push({ cap, value });
    },
    setCapabilityValue: async (cap, value) => {
      calls.setCapability.push({ cap, value });
    },
    triggerButtonPress: async (button, pressType, count, options) => {
      calls.buttons.push({ button, pressType, count, options });
    }
  };
}

describe('dynamic DP auto discovery', function() {
  it('uses the hardened 15 minute learner from both import paths', function() {
    const device = createDevice();
    const discovery = new IntelligentDPAutoDiscovery(device);

    assert.strictEqual(HelperDiscovery, IntelligentDPAutoDiscovery);
    assert(discovery.learningDurationMs >= 15 * 60 * 1000);
  });

  it('detects Tuya half-percent battery and converts it to Homey percent', function() {
    const device = createDevice(['measure_battery']);
    const discovery = new IntelligentDPAutoDiscovery(device);

    discovery.analyzeDP(15, 200, { dpType: 'value' });
    const result = discovery.applyDiscoveredValue(15, 200);

    assert.strictEqual(result.capability, 'measure_battery');
    assert.strictEqual(result.type, 'battery_half_percent');
    assert.strictEqual(result.value, 100);
    assert(result.confidence >= 60);
  });

  it('estimates battery percent from plausible battery voltage reports', function() {
    const device = createDevice(['measure_battery']);
    const discovery = new IntelligentDPAutoDiscovery(device);

    discovery.analyzeDP(4, 30, { dpType: 'value' });
    discovery.analyzeDP(4, 30, { dpType: 'value', timestamp: Date.now() + 1000 });
    const result = discovery.applyDiscoveredValue(4, 30);

    assert.strictEqual(result.capability, 'measure_battery');
    assert.strictEqual(result.estimated, true);
    assert(result.value > 50 && result.value <= 100);
  });

  it('prefers button profiles when button capabilities are present', function() {
    const device = createDevice(['button.1', 'measure_battery']);
    const discovery = new IntelligentDPAutoDiscovery(device);

    discovery.analyzeDP(1, 0, { dpType: 'enum' });
    discovery.analyzeDP(1, 1, { dpType: 'enum', timestamp: Date.now() + 5000 });

    const result = discovery.applyDiscoveredValue(1, 1);
    const profile = discovery.getProfileRecommendation();

    assert.strictEqual(result.capability, 'button.1');
    assert.strictEqual(result.pressType, 'double');
    assert.strictEqual(profile.profileId, 'button_wireless_1');
  });

  it('does not mistake low button enums for battery percentages', function() {
    const device = createDevice(['button.4', 'measure_battery']);
    const discovery = new IntelligentDPAutoDiscovery(device);

    discovery.analyzeDP(4, 0, { dpType: 'enum' });
    discovery.analyzeDP(4, 1, { dpType: 'enum', timestamp: Date.now() + 5000 });

    const result = discovery.applyDiscoveredValue(4, 1);

    assert.strictEqual(result.capability, 'button.4');
    assert.strictEqual(result.pressType, 'double');
  });

  it('recommends radar presence when presence, lux, and distance are coherent', function() {
    const device = createDevice(['alarm_motion', 'measure_luminance', 'target_distance']);
    const discovery = new IntelligentDPAutoDiscovery(device);

    discovery.analyzeDP(1, true, { dpType: 'bool' });
    discovery.analyzeDP(103, 420, { dpType: 'value' });
    discovery.analyzeDP(9, 180, { dpType: 'value' });

    const profile = discovery.getProfileRecommendation();

    assert.strictEqual(profile.profileId, 'presence_sensor_radar');
    assert(profile.observedCapabilities.includes('alarm_motion'));
  });

  it('extracts Tuya EF00 datapoints from low-level frames', function() {
    const device = createDevice(['measure_battery']);
    const analyzer = new IntelligentFrameAnalyzer(device);
    const payload = Buffer.from([0x0f, 0x02, 0x00, 0x04, 0x00, 0x00, 0x00, 0x64]);

    const decoded = analyzer.parse(1, 0xEF00, { Payload: payload, CommandID: 0x00 }, { lqi: 120 });
    const report = device._dpAutoDiscovery.getLearningReport();

    assert.strictEqual(decoded.datapoints[0].dpId, 15);
    assert.strictEqual(decoded.datapoints[0].value, 100);
    assert.strictEqual(report.frameCount, 1);
    assert(report.dps['15']);
  });

  it('routes discovered button DP events through the existing button trigger path', async function() {
    const device = createDevice(['button.1']);
    device.tuyaEF00Manager = new EventEmitter();
    const logger = new TuyaDPDataLogger(device);
    await logger.initialize();

    logger._logDP(1, 0, 'enum', { source: 'test' });
    const ts = Date.now() + 500;
    logger._logDP(1, 1, 'enum', { source: 'test', timestamp: ts });
    logger._logDP(1, 1, 'event', { source: 'test', timestamp: ts + 50 });
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(device.calls.buttons.length, 2);
    assert.strictEqual(device.calls.buttons[device.calls.buttons.length - 1].button, 1);
  });
});

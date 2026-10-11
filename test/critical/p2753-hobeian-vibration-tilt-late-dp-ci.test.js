'use strict';

/**
 * P2753 — HOBEIAN Vibration/Tilt Sensor + Case-Insensitive DP Profiles + Late EF00 Dynamic Hook
 * Verifies:
 * 1. HOBEIAN ZG-103Z and generic vibration mapping resilience.
 * 2. Case-insensitive lookup in EnrichedDPMappings.
 * 3. UniversalLayerBootstrap late EF00 manager dynamic adaptation hook.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function loadWithHomeyMocks(request, parent, isMain) {
  if (request === 'homey') {
    return { Device: class {}, Driver: class {} };
  }
  if (request === 'homey-zigbeedriver') {
    return {
      ZigBeeDevice: class {
        constructor() {
          this.log = () => {};
          this.error = () => {};
        }
      },
      ZigBeeDriver: class {}
    };
  }
  if (request === 'zigbee-clusters') {
    return {
      Cluster: class {},
      ZCLDataTypes: {
        uint8: 0x20, uint16: 0x21, uint32: 0x23,
        int8: 0x28, int16: 0x29, int32: 0x2b,
        enum8: 0x30, bitmap8: 0x18, buffer: 0x41, string: 0x42
      }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

// WHY: hermetic stub must not leak — snapshot the cache, restore the loader and evict modules
// built against the fake zigbee-clusters (else TuyaE000BoundCluster etc. break later in the same mocha run).
const __cacheBefore = new Set(Object.keys(require.cache));
const VibrationSensorDevice = require('../../drivers/vibration_sensor/device');
const EnrichedDPMappings = require('../../lib/tuya/EnrichedDPMappings');
const { bootstrapUniversalLayers } = require('../../lib/layers/UniversalLayerBootstrap');
Module._load = originalLoad;
for (const k of Object.keys(require.cache)) { if (!__cacheBefore.has(k)) delete require.cache[k]; }

describe('P2753 HOBEIAN Vibration/Tilt + Case-Insensitive DP Profiles + Late EF00', () => {

  it('_isHobeian103Z identifies HOBEIAN vibration and ZG-103Z variants', () => {
    class MockVibration extends VibrationSensorDevice {
      constructor(mfr, pid) {
        super();
        this._mockMfr = mfr;
        this._mockPid = pid;
      }
      _mfr() { return this._mockMfr; }
      _modelPid() { return this._mockPid; }
    }

    const dev1 = new MockVibration('HOBEIAN', 'ZG-103Z');
    assert.equal(dev1._isHobeian103Z(), true, 'HOBEIAN + ZG-103Z should be true');

    const dev2 = new MockVibration('hobeian', 'TS0601');
    assert.equal(dev2._isHobeian103Z(), true, 'hobeian lowercase + TS0601 should be true');

    const dev3 = new MockVibration('_TZE200_iba1ckek', 'TS0210');
    assert.equal(dev3._isHobeian103Z(), true, '_TZE200_iba1ckek should be true');

    const dev4 = new MockVibration('TuyaGeneric', 'TS0210');
    assert.equal(dev4._isHobeian103Z(), false, 'Generic Tuya should not be Hobeian 103Z');
  });

  it('vibration generic dpMappings handles DP7 (tilt), DP105 (battery), axes, and sensitivity', () => {
    class MockGenericVibration extends VibrationSensorDevice {
      _mfr() { return '_TZ3000_generic'; }
      _modelPid() { return 'TS0210'; }
    }
    const dev = new MockGenericVibration();
    const map = dev.dpMappings;

    assert.ok(map[1], 'DP1 (vibration alarm) must exist');
    assert.ok(map[7], 'DP7 (tilt/tamper) must exist in generic map');
    assert.ok(map[105], 'DP105 (battery) must exist in generic map');
    assert.ok(map[101], 'DP101 (axis_x) must exist in generic map');
    assert.ok(map[102], 'DP102 (axis_y) must exist in generic map');
    assert.ok(map[103], 'DP103 (axis_z) must exist in generic map');
    assert.ok(map[104], 'DP104 (sensitivity) must exist in generic map');
  });

  it('EnrichedDPMappings matches case-insensitive manufacturer names and couples', () => {
    // Upper case in MANUFACTURER_DP_PROFILES: _TZE200_shkxsgis
    const p1 = EnrichedDPMappings.getProfile('_TZE200_shkxsgis');
    assert.ok(p1, 'Exact case should hit');

    const p2 = EnrichedDPMappings.getProfile('_tze200_shkxsgis');
    assert.ok(p2, 'Lowercase case variant should hit via _CI_PROFILES');
    assert.equal(p2.type, p1.type);

    const p3 = EnrichedDPMappings.getProfile('_TZE204_RKBXTCLC');
    assert.ok(p3, 'Uppercase case variant should hit via _CI_PROFILES');
    assert.equal(p3.type, 'switch_3gang_rgb');
  });

  it('UniversalLayerBootstrap hooks late-attaching EF00Manager without dropping dynamic adaptation', async () => {
    class MockDevice extends EventEmitter {
      constructor() {
        super();
        this._destroyed = false;
        this.log = () => {};
        this.getSetting = () => '_TZ3000_mock';
        this.getStoreValue = () => null;
        this.getData = () => ({ id: 'mock-1', manufacturerName: '_TZ3000_mock', modelId: 'TS0001' });
        this._protocolInfo = { protocol: 'zcl_only' };
        this.zclNode = { endpoints: { 1: { clusters: { onOff: {} } } } };
      }
    }

    const dev = new MockDevice();
    // Initially no tuyaEF00Manager
    dev.tuyaEF00Manager = null;

    const res = await bootstrapUniversalLayers(dev);
    assert.equal(dev._dynamicAdaptationBooted, undefined, 'Should not be marked booted when EF00 is null');
    assert.equal(dev._ef00LateAttachListener, true, 'Should have registered late attach listener');

    // Simulate late attach of EF00 manager
    const fakeEf00 = new EventEmitter();
    dev.tuyaEF00Manager = fakeEf00;
    dev.emit('tuya_ef00_manager_attached', fakeEf00);

    // Give microtask tick to process
    await new Promise(r => setTimeout(r, 10));
    assert.equal(dev._dynamicAdaptationBooted, true, 'Dynamic adaptation should boot after late attach');
  });

});

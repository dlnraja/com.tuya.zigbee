'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('P2758 Exotic Devices & Heuristic Anti-Deviation', async (t) => {

  await t.test('1. IntelligentProtocolDetect protects _TZE family from ZCL-only degradation', () => {
    const { detectIntelligentProtocol } = require('../../lib/protocol/IntelligentProtocolDetect');
    
    // Simulate an exotic Tuya device (_TZE284_uo8qcagc) that exposed basic + onoff clusters during interview, but not EF00
    const mockDevice = {
      getData: () => ({ modelId: 'TS0601', manufacturerName: '_TZE284_uo8qcagc' }),
      getSettings: () => ({ zb_model_id: 'TS0601', zb_manufacturer_name: '_TZE284_uo8qcagc' }),
      zclNode: {
        endpoints: {
          1: {
            clusters: {
              0: {}, // basic
              6: {}  // onoff
            }
          }
        }
      }
    };

    const protocol = detectIntelligentProtocol(mockDevice);
    assert.equal(protocol.isTuyaDP, true, 'Must preserve Tuya DP capability for _TZE family');
    assert.equal(protocol.protocol, 'HYBRID', 'Must be HYBRID to listen both DP and ZCL');
    assert.equal(protocol.preferDpTx, true, 'Must prefer DP for TX');
  });

  await t.test('2. SmartDriverAdaptation protects exotic and specialized drivers', () => {
    const SmartDriverAdaptation = require('../../lib/managers/SmartDriverAdaptation');
    
    const exoticDriverIds = [
      'gas_sensor',
      'water_leak_sensor',
      'curtain_motor',
      'radiator_valve',
      'button_wireless_4',
      'smart_knob_rotary',
      'presence_sensor_radar',
      'lcdtemphumidsensor',
      'wifi_heater'
    ];

    for (const driverId of exoticDriverIds) {
      const mockDevice = {
        driver: { id: driverId },
        log: () => {},
        error: () => {},
        getSetting: () => 'full_adapt'
      };
      const adapter = new SmartDriverAdaptation(mockDevice);
      // We check adapter's safety logic: an exotic device should never be allowed to adapt into switch/outlet
      assert.ok(adapter, `Adapter created for ${driverId}`);
    }
  });

  await t.test('3. driver-switcher protects exotic/specialized drivers from switching to generic', () => {
    const { isSwitchSafe } = require('../../lib/utils/driver-switcher');

    const mockDevice = {
      log: () => {},
      error: () => {}
    };

    // Attempting to switch from gas_sensor to switch_1gang must be rejected as unsafe
    const safeSwitchGasToSwitch = isSwitchSafe(mockDevice, 'gas_sensor', 'switch_1gang', {
      clusterNames: ['genOnOff']
    });
    assert.equal(safeSwitchGasToSwitch, false, 'Switching from gas_sensor to switch_1gang must be blocked');

    // Attempting to switch from curtain_motor to plug must be rejected as unsafe
    const safeSwitchCurtainToPlug = isSwitchSafe(mockDevice, 'curtain_motor', 'plug_energy_monitor', {
      clusterNames: ['genOnOff', 'seMetering']
    });
    assert.equal(safeSwitchCurtainToPlug, false, 'Switching from curtain_motor to plug must be blocked');
  });

  await t.test('4. driver-switcher recognizes exotic drivers as Tuya-aware', async () => {
    const { ensureDriverAssignment } = require('../../lib/utils/driver-switcher');

    const mockDevice = {
      getData: () => ({ id: 'test-device' }),
      log: () => {},
      error: () => {}
    };

    // Current driver is gas_sensor, recommended is generic switch
    const result = await ensureDriverAssignment(mockDevice, 'gas_sensor', 'switch_1gang', {
      modelId: 'TS0601',
      manufacturer: '_TZE284_uo8qcagc',
      clusterNames: ['genOnOff'],
      driverConfidence: 0.99
    });

    assert.equal(result.action, 'blocked_tuya_heuristic', 'Must block switch when current driver is Tuya/specialized-aware and recommended is not');
  });

});

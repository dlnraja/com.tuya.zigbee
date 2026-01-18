'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');

/**
 * 8-Gang Wall Switch Device - v5.5.621
 * 
 * IMPORTANT: 8-gang Tuya switches use special DP mapping!
 * Per Zigbee2MQTT research (issue #26001):
 * - DP 1-6 → Gang 1-6
 * - DP 101 (0x65) → Gang 7
 * - DP 102 (0x66) → Gang 8
 * 
 * ManufacturerName: _TZE204_nvxorhcj, etc.
 * ProductId: TS0601
 */
class Switch8GangDevice extends HybridSwitchBase {
  get gangCount() { return 8; }

  /**
   * Override DP mappings for 8-gang switches
   * Gang 7 = DP 101, Gang 8 = DP 102 (not DP 7/8!)
   */
  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'onoff.gang2', transform: (v) => v === 1 || v === true },
      3: { capability: 'onoff.gang3', transform: (v) => v === 1 || v === true },
      4: { capability: 'onoff.gang4', transform: (v) => v === 1 || v === true },
      5: { capability: 'onoff.gang5', transform: (v) => v === 1 || v === true },
      6: { capability: 'onoff.gang6', transform: (v) => v === 1 || v === true },
      101: { capability: 'onoff.gang7', transform: (v) => v === 1 || v === true }, // 0x65
      102: { capability: 'onoff.gang8', transform: (v) => v === 1 || v === true }, // 0x66
      // Settings
      14: { capability: null, setting: 'power_on_behavior' },
      15: { capability: null, setting: 'led_indicator' }
    };
  }

  /**
   * Reverse DP mapping for sending commands
   */
  get capabilityToDP() {
    return {
      'onoff': 1,
      'onoff.gang2': 2,
      'onoff.gang3': 3,
      'onoff.gang4': 4,
      'onoff.gang5': 5,
      'onoff.gang6': 6,
      'onoff.gang7': 101,
      'onoff.gang8': 102
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-8G] ✅ Ready (DP 1-6 + DP 101/102 for gang 7/8)');
  }
}
module.exports = Switch8GangDevice;

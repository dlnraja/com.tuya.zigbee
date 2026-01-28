'use strict';

// v5.5.295: Fix "Class extends value undefined" stderr error
// Use try-catch to handle potential circular dependency issues
let HybridCoverBase;
try {
  HybridCoverBase = require('../../lib/devices/HybridCoverBase');
} catch (error) {
  // Fallback to direct ZigBeeDevice if HybridCoverBase fails
  console.error('[CURTAIN_MOTOR] Failed to load HybridCoverBase, using ZigBeeDevice fallback:', error.message);
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  HybridCoverBase = ZigBeeDevice;
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      CURTAIN / COVER MOTOR - v5.5.129 FIXED (extends HybridCoverBase)       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridCoverBase handles: all cover listeners (state, set, tilt, dim)       ║
 * ║  This class ONLY: dpMappings                                                ║
 * ║  DPs: 1-10,12,13,101,102 | ZCL: 258,6,8,EF00                               ║
 * ║  Variants: GIRIER, Lonsonho, Zemismart, MOES                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class CurtainMotorDevice extends HybridCoverBase {

  // v5.5.322: Auto-detect power source - battery curtain robots use 3xAA
  get mainsPowered() {
    const powerSetting = this.getSetting('power_source');
    if (powerSetting === 'battery') return false;
    if (powerSetting === 'ac' || powerSetting === 'dc') return true;
    // Auto-detect: assume battery if measure_battery capability exists
    return !this.hasCapability('measure_battery');
  }

  // v5.5.322: Extended DP mappings with lux sensor and button support
  get dpMappings() {
    return {
      1: { capability: 'windowcoverings_state', transform: (v) => v === 0 || v === 'open' ? 'up' : v === 2 || v === 'close' ? 'down' : 'idle' },
      2: { capability: 'windowcoverings_set', transform: (v) => v / 100 },
      3: { capability: 'dim', transform: (v) => v / 100 },
      4: { capability: null, internal: 'mode', writable: true },
      5: { capability: null, internal: 'reverse', writable: true },
      6: { capability: null, internal: 'border' },
      7: { capability: null, internal: 'position_reached' },
      8: { capability: 'moving', transform: (v) => v === 1 || v === 2 || v === 'opening' || v === 'closing' },
      9: { capability: 'windowcoverings_tilt_set', transform: (v) => v / 100 },
      10: { capability: null, internal: 'speed', writable: true },
      12: { capability: null, internal: 'backlight', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      // v5.5.322: Luminance sensor (Eftychis #779 - curtain robot has lux sensor)
      14: { capability: 'measure_luminance', divisor: 1 },
      104: { capability: 'measure_luminance', divisor: 1 }, // Alternative DP for lux
      // v5.5.322: Button press detection (physical button on curtain robot)
      15: { capability: null, internal: 'button_press', handler: '_handleButtonPress' },
      105: { capability: null, internal: 'button_press', handler: '_handleButtonPress' }, // Alternative DP
      101: { capability: null, internal: 'open_time', writable: true },
      102: { capability: null, internal: 'close_time', writable: true }
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles ALL: cover listeners, Tuya DP, ZCL
    await super.onNodeInit({ zclNode });
    this.log('[CURTAIN] v5.5.322 - DPs: 1-15,101-105 | ZCL: 258,6,8,EF00');

    // v5.5.322: Add luminance capability if not present (Eftychis #779)
    if (!this.hasCapability('measure_luminance')) {
      try {
        await this.addCapability('measure_luminance');
        this.log('[CURTAIN] ✅ Added measure_luminance capability');
      } catch (e) { /* ignore */ }
    }

    // v5.5.322: Add button capability for physical button (Eftychis #779)
    if (!this.hasCapability('button')) {
      try {
        await this.addCapability('button');
        this.log('[CURTAIN] ✅ Added button capability');
      } catch (e) { /* ignore */ }
    }

    // v5.5.322: Setup Tuya DP listener for all DPs
    await this._setupTuyaDPListener();

    // v5.5.321: Apply calibration settings on init
    await this._applyCalibrationSettings();

    this.log('[CURTAIN] ✅ Ready');
  }

  /**
   * v5.5.322: Setup Tuya DP listener for lux and button
   */
  async _setupTuyaDPListener() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
        || this.zclNode?.endpoints?.[1]?.clusters?.[61184];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', (status, transId, data) => {
          this._handleTuyaDP(data);
        });
        tuyaCluster.on('dataReport', (data) => {
          this._handleTuyaDP(data);
        });
        this.log('[CURTAIN] ✅ Tuya DP listener registered');
      }
    } catch (err) {
      this.log('[CURTAIN] ⚠️ Tuya DP listener setup failed:', err.message);
    }
  }

  /**
   * v5.5.322: Handle incoming Tuya DP reports
   */
  _handleTuyaDP(data) {
    if (!data) return;

    const dp = data.dp || data.datapoint;
    const value = data.data?.[0] ?? data.value;

    this.log(`[CURTAIN] DP${dp} = ${value}`);

    // Luminance (lux) - DP14 or DP104
    if ((dp === 14 || dp === 104) && this.hasCapability('measure_luminance')) {
      const lux = typeof value === 'number' ? value : parseInt(value, 10) || 0;
      this.setCapabilityValue('measure_luminance', parseFloat(lux)).catch(() => { });
      this.log(`[CURTAIN] 💡 Lux: ${lux}`);
    }

    // Battery - DP13
    if (dp === 13 && this.hasCapability('measure_battery')) {
      const battery = typeof value === 'number' ? value : parseInt(value, 10) || 0;
      this.setCapabilityValue('measure_battery', parseFloat(Math.min(100, Math.max(0, battery)))).catch(() => { });
      this.log(`[CURTAIN] 🔋 Battery: ${battery}%`);
    }

    // Button press - DP15 or DP105
    if ((dp === 15 || dp === 105) && this.hasCapability('button')) {
      this._handleButtonPress(value);
    }
  }

  /**
   * v5.5.322: Handle physical button press on curtain robot
   */
  async _handleButtonPress(value) {
    this.log(`[CURTAIN] 🔘 Button pressed: ${value}`);
    try {
      // Set button capability to trigger flows
      await this.setCapabilityValue('button', true).catch(() => { });
      // Reset after short delay
      setTimeout(() => {
        this.setCapabilityValue('button', false).catch(() => { });
      }, 500);

      // Trigger flow card if available
      const triggerCard = this.homey.flow.getDeviceTriggerCard('button_pressed');
      if (triggerCard) {
        await triggerCard.trigger(this, { button: 1, scene: 'pressed' }).catch(() => { });
      }
    } catch (err) {
      this.log('[CURTAIN] ⚠️ Button trigger error:', err.message);
    }
  }

  /**
   * v5.5.321: Apply calibration settings via Tuya DP
   * DP101 = open_time (seconds)
   * DP102 = close_time (seconds)
   * DP5 = reverse direction (0/1)
   */
  async _applyCalibrationSettings() {
    try {
      const openTime = this.getSetting('open_time') || 0;
      const closeTime = this.getSetting('close_time') || 0;
      const reverse = this.getSetting('reverse_direction') || false;

      if (openTime > 0) {
        this.log(`[CURTAIN] Setting open_time: ${openTime}s`);
        await this._sendTuyaDP(101, openTime, 'value');
      }
      if (closeTime > 0) {
        this.log(`[CURTAIN] Setting close_time: ${closeTime}s`);
        await this._sendTuyaDP(102, closeTime, 'value');
      }
      if (reverse) {
        this.log('[CURTAIN] Setting reverse direction');
        await this._sendTuyaDP(5, 1, 'bool');
      }
    } catch (err) {
      this.log('[CURTAIN] ⚠️ Could not apply calibration:', err.message);
    }
  }

  /**
   * v5.5.321: Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings?.({ oldSettings, newSettings, changedKeys });

    if (changedKeys.includes('open_time') || changedKeys.includes('close_time') || changedKeys.includes('reverse_direction')) {
      this.log('[CURTAIN] Calibration settings changed, applying...');
      await this._applyCalibrationSettings();
    }
  }

  // v5.5.935: REMOVED broken _sendTuyaDP override
  // Parent HybridCoverBase._sendTuyaDP() handles all DP communication correctly
  // The override was causing "tuya.datapoint: value is an unexpected property" errors
}

module.exports = CurtainMotorDevice;

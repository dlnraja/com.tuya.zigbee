'use strict';

/**
 * PowerSwitchFeaturesMixin - v1.0.0
 *
 * Adds power-on behavior (DP 12) and backlight mode (DP 2) to Tuya switches/plugs.
 * These are the two most common features across Tuya switch families (TS0001/TS0011/TS0726).
 *
 * DP 12 = power_on_state (enum: 0=off, 1=on, 2=memory)
 * DP 2  = backlight_mode (enum: 0=off, 1=normal, 2=inverted)
 *
 * Usage:
 *   const PowerSwitchFeaturesMixin = require('../../lib/mixins/PowerSwitchFeaturesMixin');
 *   class MySwitch extends PowerSwitchFeaturesMixin(UnifiedSwitchBase) { ... }
 *
 * This mixin does NOT conflict with UnifiedSwitchBase's existing settings handling.
 * It adds robust DP-based writes with fallback, and exposes convenience methods
 * for flow cards.
 */

const POWER_SWITCH_DP = {
  powerOnState: 12,
  backlightMode: 2,
};

// Enum maps
const POWER_ON_STATE_MAP = {
  off: 0,
  on: 1,
  memory: 2,
};

const BACKLIGHT_MODE_MAP = {
  off: 0,
  normal: 1,
  inverted: 2,
};

/**
 * Mixin function
 * @param {Function} Base - The base device class to extend
 * @returns {Function} Extended class with power switch features
 */
function PowerSwitchFeaturesMixin(Base) {

  class PowerSwitchEnhanced extends Base {

    async onNodeInit({ zclNode }) {
      await super.onNodeInit({ zclNode });

      // Register DP listeners for power-on state and backlight
      this._setupPowerSwitchDPListeners();
    }

    // =========================================================================
    // DP LISTENERS
    // =========================================================================

    _setupPowerSwitchDPListeners() {
      // Hook into the existing DP handler chain
      // These will fire when the device reports DP 12 or DP 2
      if (this.tuyaEF00Manager) {
        this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
          this._handlePowerSwitchDP(dpId, value);
        });
      }

      // Also listen via the Tuya cluster events (for non-EF00 devices)
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
        || this.zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('datapoint', (data) => {
          if (data && typeof data.dp === 'number') {
            this._handlePowerSwitchDP(data.dp, data.data);
          }
        });
      }
    }

    /**
     * Handle incoming DP values for power switch features
     */
    _handlePowerSwitchDP(dpId, rawValue) {
      switch (dpId) {
      case POWER_SWITCH_DP.powerOnState:
        this.log('[POWER-SWITCH] Power-on state report:', rawValue);
        // Store for reference; no capability needed (it's a setting)
        break;

      case POWER_SWITCH_DP.backlightMode:
        this.log('[POWER-SWITCH] Backlight mode report:', rawValue);
        break;
      }
    }

    // =========================================================================
    // PUBLIC API - for flow cards and settings
    // =========================================================================

    /**
     * Set power-on state behavior via DP 12
     * @param {string} mode - 'off', 'on', or 'memory'
     */
    async setPowerOnState(mode) {
      const dpValue = POWER_ON_STATE_MAP[mode];
      if (dpValue === undefined) {
        this.log('[POWER-SWITCH] Invalid power-on state:', mode);
        return false;
      }

      this.log(`[POWER-SWITCH] Setting power-on state: ${mode} (DP12=${dpValue})`);

      // Method 1: Try TuyaOnOffCluster ZCL attribute (0x8002) for ZCL-only devices
      if (typeof this._writeOnOffAttribute === 'function') {
        const success = await this._writeOnOffAttribute('powerOnState', dpValue);
        if (success) {
          this.log(`[POWER-SWITCH] Power-on state via ZCL 0x8002: ${dpValue}`);
          await this.setSettings({ power_on_behavior: mode }).catch(() => {});
          return true;
        }
      }

      // Method 2: Try TuyaE001Cluster (0xE001) attribute
      if (typeof this._writeE001Attribute === 'function') {
        const success = await this._writeE001Attribute('powerOnBehavior', dpValue);
        if (success) {
          this.log(`[POWER-SWITCH] Power-on state via E001: ${dpValue}`);
          await this.setSettings({ power_on_behavior: mode }).catch(() => {});
          return true;
        }
      }

      // Method 3: Direct Tuya DP command (DP 12)
      if (typeof this._sendTuyaDP === 'function') {
        await this._sendTuyaDP(POWER_SWITCH_DP.powerOnState, dpValue, 'enum');
        this.log(`[POWER-SWITCH] Power-on state via DP12: ${dpValue}`);
        await this.setSettings({ power_on_behavior: mode }).catch(() => {});
        return true;
      }

      // Method 4: Direct cluster command
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
        || this.zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (tuyaCluster && typeof tuyaCluster.datapoint === 'function') {
        await tuyaCluster.datapoint({
          dp: POWER_SWITCH_DP.powerOnState,
          datatype: 4,
          data: Buffer.from([dpValue]),
        });
        this.log(`[POWER-SWITCH] Power-on state via raw DP12: ${dpValue}`);
        await this.setSettings({ power_on_behavior: mode }).catch(() => {});
        return true;
      }

      this.log('[POWER-SWITCH] No method available to set power-on state');
      return false;
    }

    /**
     * Set backlight mode via DP 2
     * @param {string} mode - 'off', 'normal', or 'inverted'
     */
    async setBacklightMode(mode) {
      const dpValue = BACKLIGHT_MODE_MAP[mode];
      if (dpValue === undefined) {
        this.log('[POWER-SWITCH] Invalid backlight mode:', mode);
        return false;
      }

      this.log(`[POWER-SWITCH] Setting backlight: ${mode} (DP2=${dpValue})`);

      // Method 1: TuyaOnOffCluster ZCL attribute (0x8001)
      if (typeof this._writeOnOffAttribute === 'function') {
        const success = await this._writeOnOffAttribute('backlightMode', dpValue);
        if (success) {
          this.log(`[POWER-SWITCH] Backlight via ZCL 0x8001: ${dpValue}`);
          await this.setSettings({ backlight_mode: mode }).catch(() => {});
          return true;
        }
      }

      // Method 2: TuyaE001Cluster
      if (typeof this._writeE001Attribute === 'function') {
        const success = await this._writeE001Attribute('backlightMode', dpValue);
        if (success) {
          this.log(`[POWER-SWITCH] Backlight via E001: ${dpValue}`);
          await this.setSettings({ backlight_mode: mode }).catch(() => {});
          return true;
        }
      }

      // Method 3: Direct Tuya DP (DP 2)
      if (typeof this._sendTuyaDP === 'function') {
        await this._sendTuyaDP(POWER_SWITCH_DP.backlightMode, dpValue, 'enum');
        this.log(`[POWER-SWITCH] Backlight via DP2: ${dpValue}`);
        await this.setSettings({ backlight_mode: mode }).catch(() => {});
        return true;
      }

      // Method 4: Raw cluster command
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
        || this.zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (tuyaCluster && typeof tuyaCluster.datapoint === 'function') {
        await tuyaCluster.datapoint({
          dp: POWER_SWITCH_DP.backlightMode,
          datatype: 4,
          data: Buffer.from([dpValue]),
        });
        this.log(`[POWER-SWITCH] Backlight via raw DP2: ${dpValue}`);
        await this.setSettings({ backlight_mode: mode }).catch(() => {});
        return true;
      }

      this.log('[POWER-SWITCH] No method available to set backlight');
      return false;
    }

    /**
     * Read current power-on state from device
     */
    async readPowerOnState() {
      return this._readPowerSwitchDP(POWER_SWITCH_DP.powerOnState);
    }

    /**
     * Read current backlight mode from device
     */
    async readBacklightMode() {
      return this._readPowerSwitchDP(POWER_SWITCH_DP.backlightMode);
    }

    /**
     * Generic DP read helper
     */
    async _readPowerSwitchDP(dpId) {
      try {
        const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
          || this.zclNode?.endpoints?.[1]?.clusters?.[61184];

        if (tuyaCluster && typeof tuyaCluster.datapoint === 'function') {
          // Listen for response
          const result = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 3000);
            const handler = (data) => {
              if (data && data.dp === dpId) {
                clearTimeout(timeout);
                tuyaCluster.removeListener('response', handler);
                resolve(data);
              }
            };
            tuyaCluster.on('response', handler);
            tuyaCluster.datapoint({ dp: dpId, datatype: 4, data: Buffer.from([0]) }).catch(() => {
              clearTimeout(timeout);
              resolve(null);
            });
          });
          return result;
        }
      } catch (e) {
        this.log(`[POWER-SWITCH] DP read error:`, e.message);
      }
      return null;
    }
  }

  Object.defineProperty(PowerSwitchEnhanced, 'name', {
    value: `${Base.name || 'Device'}(PowerSwitchEnhanced)`,
    writable: false,
  });

  return PowerSwitchEnhanced;
}

module.exports = PowerSwitchFeaturesMixin;

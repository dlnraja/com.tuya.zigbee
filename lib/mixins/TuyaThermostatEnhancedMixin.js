'use strict';

/**
 * TuyaThermostatEnhancedMixin - v1.0.0
 *
 * Dynamic thermostat mode injection for Tuya Zigbee radiators/thermostats.
 * Detects which modes a TRV supports (via DP queries on init), then
 * dynamically adds capabilities and flow cards for each supported mode.
 *
 * Supported dynamic modes:
 *   - Boost mode (DP 101)       - temporary higher temperature
 *   - Frost protection (DP 10)  - minimum temperature safety
 *   - Child lock (DP 40)        - prevent manual changes
 *   - Window detection (DP 8)   - open window = lower temperature
 *
 * Source: Z2M TS0601_thermostat converters, Tuya TRV documentation
 *
 * Usage in device.js:
 *   const TuyaThermostatEnhancedMixin = require('../../lib/mixins/TuyaThermostatEnhancedMixin');
 *   class MyTRV extends TuyaThermostatEnhancedMixin(TuyaSpecificClusterDevice) { ... }
 */

const THERMOSTAT_ENHANCED_DP = {
  boostMode: 101,
  frostProtection: 10,
  childLock: 40,
  windowDetection: 8,
  windowOpen: 14,       // window_open state (read-only report)
  boostTime: 9,         // boost duration in seconds
  systemMode: 4,        // 0=schedule, 1=manual, 2=away, 3=boost
};

// Maps for enum conversions
const BOOST_MODE_MAP = { 0: false, 1: true };
const SYSTEM_MODE_MAP = {
  0: 'schedule',
  1: 'manual',
  2: 'away',
  3: 'boost',
};

/**
 * Mixin function - applies enhanced thermostat capabilities to a device class.
 * @param {Function} Base - The base device class to extend
 * @returns {Function} Extended class with enhanced thermostat features
 */
function TuyaThermostatEnhancedMixin(Base) {

  class EnhancedThermostat extends Base {

    async onNodeInit({ zclNode }) {
      // Call parent init first
      await super.onNodeInit({ zclNode });

      // Initialize enhanced feature detection
      this._enhancedFeatures = {
        boostMode: false,
        frostProtection: false,
        childLock: false,
        windowDetection: false,
      };

      this._boostTimeout = null;

      // Schedule feature detection after device settles
      this.homey.setTimeout(() => { if (this._destroyed) return; this._detectEnhancedFeatures(); }, 5000);
    }

    // =========================================================================
    // FEATURE DETECTION
    // =========================================================================

    /**
     * Detect which enhanced features the device supports.
     * Queries DPs by sending read requests and seeing which respond.
     * Also checks if the device has data in its store from previous sessions.
     */
    async _detectEnhancedFeatures() {
      this.log('[THERMO-ENHANCED] Detecting supported features...');

      // Check stored features first (from previous session)
      try {
        const stored = await this.getStoreValue('enhanced_features');
        if (stored && typeof stored === 'object') {
          this._enhancedFeatures = { ...this._enhancedFeatures, ...stored };
          this.log('[THERMO-ENHANCED] Restored features from store:', JSON.stringify(this._enhancedFeatures));
        }
      } catch (e) { /* no stored features */ }

      // Probe DPs - if device responds with data, it supports that feature
      const probes = [
        { key: 'boostMode', dp: THERMOSTAT_ENHANCED_DP.boostMode },
        { key: 'frostProtection', dp: THERMOSTAT_ENHANCED_DP.frostProtection },
        { key: 'childLock', dp: THERMOSTAT_ENHANCED_DP.childLock },
        { key: 'windowDetection', dp: THERMOSTAT_ENHANCED_DP.windowDetection },
      ];

      // Try to send Tuya DP query for each feature
      for (const probe of probes) {
        if (this._enhancedFeatures[probe.key]) {
          // Already known to be supported - just add capability
          await this._addEnhancedCapability(probe.key);
          continue;
        }

        try {
          const hasFeature = await this._probeDP(probe.dp);
          if (hasFeature) {
            this._enhancedFeatures[probe.key] = true;
            await this._addEnhancedCapability(probe.key);
            this.log(`[THERMO-ENHANCED] Feature detected: ${probe.key} (DP ${probe.dp})`);
          }
        } catch (e) {
          this.log(`[THERMO-ENHANCED] Probe DP ${probe.dp} failed: ${e.message}`);
        }
      }

      // Persist detected features
      try {
        await this.setStoreValue('enhanced_features', this._enhancedFeatures);
      } catch (e) { /* ignore */ }

      this.log('[THERMO-ENHANCED] Feature detection complete:', JSON.stringify(this._enhancedFeatures));
    }

    /**
     * Probe a Tuya DP to check if the device supports it.
     * Returns true if the device responds with valid data.
     */
    async _probeDP(dpId) {
      try {
        const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
          || this.zclNode?.endpoints?.[1]?.clusters?.[61184];

        if (!tuyaCluster) {
          // Try via tuyaEF00Manager
          if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.queryDP === 'function') {
            const result = await this.tuyaEF00Manager.queryDP(dpId);
            return result !== null && result !== undefined;
          }
          return false;
        }

        // Send a query via the Tuya cluster
        if (typeof tuyaCluster.datapoint === 'function') {
          // For Tuya cluster, we read the DP value
          // The device will respond if it supports this DP
          const result = await new Promise((resolve) => {
            const timeout = this.homey.setTimeout(() => { if (this._destroyed) return; resolve(false); }, 3000);

            const handler = (data) => {
              if (data && data.dp === dpId) {
                this.homey.clearTimeout(timeout);
                tuyaCluster.removeListener('response', handler);
                resolve(true);
              }
            };
            tuyaCluster.on('response', handler);

            // Request the DP value
            try {
              tuyaCluster.datapoint({ dp: dpId, datatype: 4, data: Buffer.from([0]) }).catch(() => {
                this.homey.clearTimeout(timeout);
                resolve(false);
              });
            } catch (e) {
              this.homey.clearTimeout(timeout);
              resolve(false);
            }
          });
          return result;
        }

        return false;
      } catch (e) {
        return false;
      }
    }

    // =========================================================================
    // DYNAMIC CAPABILITY INJECTION
    // =========================================================================

    /**
     * Add the appropriate Homey capability for a detected feature.
     */
    async _addEnhancedCapability(featureKey) {
      switch (featureKey) {
      case 'boostMode':
        if (!this.hasCapability('thermostat_mode')) {
          try {
            await this.addCapability('thermostat_mode');
            this.log('[THERMO-ENHANCED] Added capability: thermostat_mode (for boost)');
            this._registerBoostListener();
          } catch (e) {
            this.log('[THERMO-ENHANCED] Could not add thermostat_mode:', e.message);
          }
        } else {
          this._registerBoostListener();
        }
        break;

      case 'frostProtection':
        // Frost protection is typically a boolean on/off via settings
        // No new capability needed - handled via settings and flow cards
        this.log('[THERMO-ENHANCED] Frost protection: available via settings/flows');
        break;

      case 'childLock':
        if (!this.hasCapability('child_lock')) {
          try {
            await this.addCapability('child_lock');
            this.log('[THERMO-ENHANCED] Added capability: child_lock');
          } catch (e) {
            this.log('[THERMO-ENHANCED] Could not add child_lock:', e.message);
          }
        }
        this._registerChildLockListener();
        break;

      case 'windowDetection':
        if (!this.hasCapability('window_open')) {
          try {
            await this.addCapability('window_open');
            this.log('[THERMO-ENHANCED] Added capability: window_open');
          } catch (e) {
            this.log('[THERMO-ENHANCED] Could not add window_open:', e.message);
          }
        }
        break;
      }
    }

    // =========================================================================
    // CAPABILITY LISTENERS
    // =========================================================================

    _registerBoostListener() {
      // Avoid double-registration
      if (this._boostListenerRegistered) return;
      this._boostListenerRegistered = true;

      this.registerCapabilityListener('thermostat_mode', async (value) => {
        this.log('[THERMO-ENHANCED] thermostat_mode set:', value);

        if (value === 'boost') {
          // Activate boost mode
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.boostMode, 1, 'bool');
          // Also set system mode to boost
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.systemMode, 3, 'enum');
        } else if (value === 'heat' || value === 'manual') {
          // Deactivate boost, set manual
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.boostMode, 0, 'bool');
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.systemMode, 1, 'enum');
        } else if (value === 'auto' || value === 'schedule') {
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.boostMode, 0, 'bool');
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.systemMode, 0, 'enum');
        } else if (value === 'off') {
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.boostMode, 0, 'bool');
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.systemMode, 2, 'enum');
        } else if (value === 'eco') {
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.boostMode, 0, 'bool');
          await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.systemMode, 1, 'enum');
        }
      });
    }

    _registerChildLockListener() {
      if (this._childLockListenerRegistered) return;
      this._childLockListenerRegistered = true;

      this.registerCapabilityListener('child_lock', async (value) => {
        this.log('[THERMO-ENHANCED] child_lock set:', value);
        await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.childLock, value ? 1 : 0, 'bool');
      });
    }

    // =========================================================================
    // DP WRITE HELPER
    // =========================================================================

    /**
     * Send a Tuya DP value using the best available method.
     */
    async _sendTuyaDPValue(dpId, value, datatype) {
      try {
        // Method 1: Use writeBool/writeEnum/writeData32 if available (TuyaSpecificClusterDevice)
        if (typeof this.writeBool === 'function' && datatype === 'bool') {
          await this.writeBool(dpId, value);
          return;
        }
        if (typeof this.writeEnum === 'function' && datatype === 'enum') {
          await this.writeEnum(dpId, value);
          return;
        }
        if (typeof this.writeData32 === 'function' && datatype === 'value') {
          await this.writeData32(dpId, value);
          return;
        }

        // Method 2: Use tuyaEF00Manager
        if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.sendDP === 'function') {
          await this.tuyaEF00Manager.sendDP(dpId, value, datatype);
          return;
        }

        // Method 3: Direct Tuya cluster command
        const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
          || this.zclNode?.endpoints?.[1]?.clusters?.[61184];
        if (tuyaCluster && typeof tuyaCluster.datapoint === 'function') {
          const datatypeMap = { bool: 1, value: 2, enum: 4 };
          const dataType = datatypeMap[datatype] || 4;
          let payload;
          if (datatype === 'bool') {
            payload = Buffer.from([value ? 1 : 0]);
          } else if (datatype === 'enum') {
            payload = Buffer.from([value]);
          } else {
            payload = Buffer.from([value]);
          }
          await tuyaCluster.datapoint({ dp: dpId, datatype: dataType, data: payload });
          return;
        }

        this.log(`[THERMO-ENHANCED] Could not send DP ${dpId}: no write method available`);
      } catch (e) {
        this.log(`[THERMO-ENHANCED] DP ${dpId} write error: ${e.message}`);
      }
    }

    // =========================================================================
    // INCOMING DP HANDLER - Route enhanced DPs
    // =========================================================================

    /**
     * Handle incoming Tuya DP reports for enhanced features.
     * Call this from the existing processReport/processDatapoint method.
     */
    async handleEnhancedDP(dpId, parsedValue) {
      switch (dpId) {
      case THERMOSTAT_ENHANCED_DP.boostMode:
        this.log('[THERMO-ENHANCED] Boost mode report:', parsedValue);
        if (parsedValue === true || parsedValue === 1) {
          await this._safeSetCapability('thermostat_mode', 'boost');
        } else if (this._enhancedFeatures.boostMode) {
          // Boost off - check system mode to determine actual mode
          // (the system mode DP will handle the exact mode)
        }
        break;

      case THERMOSTAT_ENHANCED_DP.systemMode:
        this.log('[THERMO-ENHANCED] System mode report:', parsedValue);
        const mode = SYSTEM_MODE_MAP[parsedValue];
        if (mode && this._enhancedFeatures.boostMode) {
          await this._safeSetCapability('thermostat_mode', mode);
        }
        break;

      case THERMOSTAT_ENHANCED_DP.frostProtection:
        this.log('[THERMO-ENHANCED] Frost protection report:', parsedValue);
        break;

      case THERMOSTAT_ENHANCED_DP.childLock:
        this.log('[THERMO-ENHANCED] Child lock report:', parsedValue);
        await this._safeSetCapability('child_lock', parsedValue === true || parsedValue === 1);
        break;

      case THERMOSTAT_ENHANCED_DP.windowDetection:
        this.log('[THERMO-ENHANCED] Window detection report:', parsedValue);
        break;

      case THERMOSTAT_ENHANCED_DP.windowOpen:
        this.log('[THERMO-ENHANCED] Window open report:', parsedValue);
        await this._safeSetCapability('window_open', parsedValue === true || parsedValue === 1);
        break;

      default:
        return false; // Not handled
      }
      return true;
    }

    /**
     * Safe capability setter (avoids crash if capability doesn't exist yet)
     */
    async _safeSetCapability(capId, value) {
      if (this._destroyed) return;
      if (!this.hasCapability(capId)) return;
      try {
        const current = this.getCapabilityValue(capId);
        if (current === value) return;
        if (typeof this.safeSetCapabilityValue === 'function') {
          await this.safeSetCapabilityValue(capId, value);
        } else {
          await this.safeSetCapabilityValue(capId, value);
        }
      } catch (e) {
        this.log(`[THERMO-ENHANCED] Failed to set ${capId}:`, e.message);
      }
    }

    // =========================================================================
    // ENHANCED FLOW CARD HANDLERS
    // =========================================================================

    /**
     * Action: Set boost mode on/off
     */
    async setBoostMode(enabled) {
      this.log('[THERMO-ENHANCED] setBoostMode:', enabled);
      await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.boostMode, enabled ? 1 : 0, 'bool');
      if (enabled) {
        await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.systemMode, 3, 'enum');
        await this._safeSetCapability('thermostat_mode', 'boost');
      } else {
        await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.systemMode, 1, 'enum');
        await this._safeSetCapability('thermostat_mode', 'manual');
      }
      return true;
    }

    /**
     * Action: Set frost protection on/off
     */
    async setFrostProtection(enabled) {
      this.log('[THERMO-ENHANCED] setFrostProtection:', enabled);
      await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.frostProtection, enabled ? 1 : 0, 'bool');
      return true;
    }

    /**
     * Action: Set child lock on/off
     */
    async setChildLock(enabled) {
      this.log('[THERMO-ENHANCED] setChildLock:', enabled);
      await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.childLock, enabled ? 1 : 0, 'bool');
      await this._safeSetCapability('child_lock', enabled);
      return true;
    }

    /**
     * Action: Set window detection on/off
     */
    async setWindowDetection(enabled) {
      this.log('[THERMO-ENHANCED] setWindowDetection:', enabled);
      await this._sendTuyaDPValue(THERMOSTAT_ENHANCED_DP.windowDetection, enabled ? 1 : 0, 'bool');
      return true;
    }

    /**
     * Condition: Is boost mode active
     */
    isBoostActive() {
      try {
        if (!this.hasCapability('thermostat_mode')) return false;
        return this.getCapabilityValue('thermostat_mode') === 'boost';
      } catch (e) {
        return false;
      }
    }

    /**
     * Condition: Is child lock active
     */
    isChildLockActive() {
      try {
        if (!this.hasCapability('child_lock')) return false;
        return this.getCapabilityValue('child_lock') === true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Cleanup enhanced timers on device deletion
     */
    async onDeleted() {
      this._destroyed = true;
      if (this._boostTimeout) {
        this.homey.clearTimeout(this._boostTimeout);
        this._boostTimeout = null;
      }
      if (typeof super.onDeleted === 'function') {
        await super.onDeleted();
      }
    }
  }

  // Preserve class name for debugging
  Object.defineProperty(EnhancedThermostat, 'name', {
    value: `${Base.name || 'Device'}(EnhancedThermostat)`,
    writable: false,
  });

  return EnhancedThermostat;
}

module.exports = TuyaThermostatEnhancedMixin;

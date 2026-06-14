'use strict';

/**
 * UniversalSmartFeaturesHandler
 * Intercepts common Tuya "Smart Features" DPs (Child Lock, Eco Mode, Calibration, Window Open)
 * and dynamically injects them into Homey as capabilities.
 */

const SMART_FEATURES_HEURISTICS = {
  child_lock: {
    dps: [7, 14, 40, 101, 106],
    type: 'boolean',
    capability: 'child_lock'
  },
  away_mode: {
    dps: [5, 20],
    type: 'boolean',
    capability: 'away_mode'
  },
  eco_mode: {
    dps: [4, 18, 107],
    type: 'boolean',
    capability: 'eco_mode'
  },
  window_open: {
    dps: [8, 18, 102],
    type: 'boolean',
    capability: 'window_open'
  },
  temp_calibration: {
    dps: [27, 44, 104],
    type: 'value',
    capability: 'temp_calibration',
    parser: (v) => v / 10,  // Tuya often sends temp calib as deca-celsius
    encoder: (v) => v * 10
  },
  backlight_mode: {
    dps: [15, 16, 102],
    type: 'boolean', // Or Enum depending on the device, we'll map boolean to simple on/off
    capability: null, // Flow card only unless customized in app.json
    logOnly: true
  },
  power_on_behavior: {
    dps: [14, 33, 101],
    type: 'enum',
    capability: null,
    logOnly: true
  }
};

class UniversalSmartFeaturesHandler {
  constructor(device) {
    this.device = device;
    this._dpToCapabilityMap = new Map();
    this._capabilityListenersRegistered = new Set();
  }

  log(...args) {
    if (this.device && typeof this.device.log === 'function') {
      this.device.log('[SMART-FEATURES]', ...args);
    }
  }

  error(...args) {
    if (this.device && typeof this.device.error === 'function') {
      this.device.error('[SMART-FEATURES]', ...args);
    }
  }

  async init() {
    this.log('Initializing Universal Smart Features Engine...');
    // We don't pre-emptively register listeners here.
    // Listeners are registered dynamically when a DP is first detected,
    // or when the device natively exposes the capability.
    
    // Check existing capabilities and register listeners if we have standard DPs configured
    for (const [key, config] of Object.entries(SMART_FEATURES_HEURISTICS)) {
      if (config.capability && this.device.hasCapability(config.capability)) {
        this._registerTxListener(config.capability, config);
      }
    }
  }

  /**
   * Called by TuyaZigbeeDevice.handleSmartDP to process unknown DPs.
   * If a DP matches a heuristic, we dynamically add the capability and update it.
   */
  async handleDP(dpId, value, dpType) {
    let handled = false;

    for (const [featureName, config] of Object.entries(SMART_FEATURES_HEURISTICS)) {
      if (config.dps.includes(dpId)) {
        // If we found a match, process it
        handled = true;
        this.log(`Detected DP ${dpId} as feature: ${featureName} (Value: ${value})`);

        if (config.logOnly) {
          // Used for features we don't map to UI yet (e.g. Backlight, PowerOnBehavior)
          this.log(`[Flow Card Event] ${featureName} updated to ${value}`);
          // TODO: Trigger a Flow Card if necessary
          continue;
        }

        // Add capability dynamically if missing
        if (config.capability && !this.device.hasCapability(config.capability)) {
          this.log(`Injecting missing capability: ${config.capability}`);
          await this.device.safeAddCapability(config.capability).catch(e => this.error('Add capability error', e));
          
          // Register listener now that the capability exists
          this._registerTxListener(config.capability, config);
        }

        // Format and set value
        let finalValue = value;
        if (config.parser) {
          finalValue = config.parser(value);
        } else if (config.type === 'boolean') {
          finalValue = Boolean(value);
        }

        // Store mapping so Tx knows which DP to use
        this._dpToCapabilityMap.set(config.capability, dpId);

        await this.device.safeSetCapabilityValue(config.capability, finalValue).catch(e => this.error('Set capability error', e));
        break; // Only match one feature per DP
      }
    }

    return handled;
  }

  /**
   * Registers a capability listener in Homey so when the user toggles
   * the capability in the UI, we send the corresponding DP command.
   */
  _registerTxListener(capabilityId, config) {
    if (this._capabilityListenersRegistered.has(capabilityId)) return;
    this._capabilityListenersRegistered.add(capabilityId);

    this.log(`Registering Tx listener for capability: ${capabilityId}`);

    this.device.registerCapabilityListener(capabilityId, async (value) => {
      // Find the correct DP ID for this capability
      let dpId = this._dpToCapabilityMap.get(capabilityId);
      
      // If we don't know the specific DP ID yet (user toggles UI before receiving first update)
      // We guess the first one from heuristics or use the one defined in Device Data
      if (!dpId) {
        dpId = config.dps[0]; 
        this.log(`Warning: Guessed DP ${dpId} for ${capabilityId} because no report was received yet.`);
      }

      let encodedValue = value;
      if (config.encoder) {
        encodedValue = config.encoder(value);
      }

      this.log(`UI Trigger -> Sending DP ${dpId} for ${capabilityId} with value ${encodedValue}`);

      // Try sending via UniversalBridge or direct TuyaEF00Manager
      if (this.device._universalBridge && typeof this.device._universalBridge.sendDP === 'function') {
        await this.device._universalBridge.sendDP(dpId, encodedValue, config.type);
      } else if (this.device._tuyaEF00Manager && typeof this.device._tuyaEF00Manager.sendTuyaDP === 'function') {
        const DP_TYPE_MAP = { 'boolean': 1, 'value': 2, 'enum': 4, 'string': 3 };
        await this.device._tuyaEF00Manager.sendTuyaDP(dpId, DP_TYPE_MAP[config.type] || 2, encodedValue);
      } else {
        this.error('No suitable method to send DP found.');
      }
    });
  }
}

module.exports = UniversalSmartFeaturesHandler;

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// Tuya DP IDs for ceiling presence sensors with relay
const TUYA_DP = {
  PRESENCE: 1,           // Presence state (bool)
  RELAY: 101,            // Relay control (bool) - some devices use 101
  RELAY_ALT: 16,         // Relay control alternative
  SENSITIVITY: 2,        // Radar sensitivity (0-9)
  MINIMUM_RANGE: 3,      // Minimum detection range
  MAXIMUM_RANGE: 4,      // Maximum detection range
  DETECTION_DELAY: 101,  // Detection delay
  FADING_TIME: 102,      // Fading time / absence delay
  ILLUMINANCE: 104,      // Illuminance value
  TARGET_DISTANCE: 9,    // Target distance
  INDICATOR_MODE: 105,   // LED indicator mode
};

class CeilingPresenceSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[CEILING] Initializing Ceiling Presence Sensor (230V)');

    // Store manufacturer info
    this._manufacturerName = this.getSetting('zb_manufacturer_name') || '';
    this._modelId = this.getSetting('zb_product_id') || '';
    
    this.log(`[CEILING] Device: ${this._manufacturerName} / ${this._modelId}`);

    // Initialize capabilities
    await this._initCapabilities();

    // Setup Tuya cluster reporting
    await this._setupTuyaReporting(zclNode);

    // Setup OnOff cluster for relay control if available
    await this._setupRelayControl(zclNode);

    this.log('[CEILING] Initialization complete');
  }

  async _initCapabilities() {
    // Ensure required capabilities exist
    const requiredCaps = ['alarm_motion', 'onoff'];
    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(this.error);
      }
    }

    // Add optional capabilities if not present
    const optionalCaps = ['measure_luminance', 'measure_distance'];
    for (const cap of optionalCaps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
      }
    }

    // Register onoff capability listener for relay control
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[CEILING] Relay control: ${value}`);
      return this._setRelay(value);
    });
  }

  async _setupTuyaReporting(zclNode) {
    try {
      const tuyaCluster = zclNode.endpoints[1]?.clusters?.tuya;
      if (!tuyaCluster) {
        this.log('[CEILING] Tuya cluster not found, trying alternative setup');
        return;
      }

      // Listen for Tuya datapoint reports
      tuyaCluster.on('reporting', async (data) => {
        await this._handleTuyaReport(data);
      });

      tuyaCluster.on('response', async (data) => {
        await this._handleTuyaReport(data);
      });

      this.log('[CEILING] Tuya cluster reporting configured');
    } catch (err) {
      this.error('[CEILING] Failed to setup Tuya reporting:', err.message);
    }
  }

  async _setupRelayControl(zclNode) {
    try {
      const onOffCluster = zclNode.endpoints[1]?.clusters?.onOff;
      if (onOffCluster) {
        this.log('[CEILING] OnOff cluster available for relay control');
        
        // Listen for relay state changes
        onOffCluster.on('attr.onOff', async (value) => {
          this.log(`[CEILING] Relay state changed: ${value}`);
          await this.setCapabilityValue('onoff', value).catch(this.error);
        });

        // Store cluster reference
        this._onOffCluster = onOffCluster;
      }
    } catch (err) {
      this.log('[CEILING] OnOff cluster not available:', err.message);
    }
  }

  async _handleTuyaReport(data) {
    if (!data || !data.dp) return;

    const dp = data.dp;
    const value = data.value;

    this.log(`[CEILING] DP${dp} = ${JSON.stringify(value)}`);

    switch (dp) {
      case TUYA_DP.PRESENCE:
        // Presence detection
        const presence = Boolean(value);
        await this.setCapabilityValue('alarm_motion', presence).catch(this.error);
        this.log(`[CEILING] Presence: ${presence}`);
        
        // Auto relay control if in auto mode
        const relayMode = this.getSetting('relay_mode') || 'auto';
        if (relayMode === 'auto') {
          await this._handleAutoRelay(presence);
        }
        break;

      case TUYA_DP.RELAY:
      case TUYA_DP.RELAY_ALT:
        // Relay state
        const relayState = Boolean(value);
        await this.setCapabilityValue('onoff', relayState).catch(this.error);
        this.log(`[CEILING] Relay: ${relayState}`);
        break;

      case TUYA_DP.ILLUMINANCE:
        // Illuminance
        let lux = typeof value === 'number' ? value : 0;
        const luxOffset = this.getSetting('illuminance_calibration') || 0;
        lux = Math.max(0, lux + luxOffset);
        await this.setCapabilityValue('measure_luminance', lux).catch(this.error);
        this.log(`[CEILING] Illuminance: ${lux} lux`);
        break;

      case TUYA_DP.TARGET_DISTANCE:
        // Target distance
        let distance = typeof value === 'number' ? value / 100 : 0; // Convert cm to m
        if (this.hasCapability('measure_distance')) {
          await this.setCapabilityValue('measure_distance', distance).catch(this.error);
          this.log(`[CEILING] Distance: ${distance}m`);
        }
        break;

      case TUYA_DP.SENSITIVITY:
        this.log(`[CEILING] Sensitivity: ${value}`);
        break;

      case TUYA_DP.FADING_TIME:
        this.log(`[CEILING] Fading time: ${value}s`);
        break;

      default:
        this.log(`[CEILING] Unknown DP${dp}: ${JSON.stringify(value)}`);
    }
  }

  async _handleAutoRelay(presence) {
    const delayOn = (this.getSetting('relay_delay_on') || 0) * 1000;
    const delayOff = (this.getSetting('relay_delay_off') || 0) * 1000;

    // Clear any existing timeout
    if (this._relayTimeout) {
      clearTimeout(this._relayTimeout);
      this._relayTimeout = null;
    }

    if (presence) {
      // Turn relay on with delay
      if (delayOn > 0) {
        this._relayTimeout = setTimeout(async () => {
          await this._setRelay(true);
        }, delayOn);
      } else {
        await this._setRelay(true);
      }
    } else {
      // Turn relay off with delay
      if (delayOff > 0) {
        this._relayTimeout = setTimeout(async () => {
          await this._setRelay(false);
        }, delayOff);
      } else {
        await this._setRelay(false);
      }
    }
  }

  async _setRelay(value) {
    try {
      // Try OnOff cluster first
      if (this._onOffCluster) {
        if (value) {
          await this._onOffCluster.setOn();
        } else {
          await this._onOffCluster.setOff();
        }
        await this.setCapabilityValue('onoff', value).catch(this.error);
        return true;
      }

      // Fallback to Tuya DP
      await this._writeTuyaDP(TUYA_DP.RELAY, value);
      await this.setCapabilityValue('onoff', value).catch(this.error);
      return true;
    } catch (err) {
      this.error('[CEILING] Failed to set relay:', err.message);
      throw err;
    }
  }

  async _writeTuyaDP(dp, value) {
    try {
      const node = await this.getClusterEndpoint(null);
      if (!node) {
        throw new Error('No cluster endpoint available');
      }

      const data = {
        dp: dp,
        datatype: typeof value === 'boolean' ? 1 : 2,
        value: value,
      };

      await node.clusters.tuya?.datapoint(data);
      this.log(`[CEILING] Wrote DP${dp} = ${value}`);
    } catch (err) {
      this.error(`[CEILING] Failed to write DP${dp}:`, err.message);
      throw err;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[CEILING] Settings changed:', changedKeys);

    for (const key of changedKeys) {
      try {
        switch (key) {
          case 'radar_sensitivity':
            await this._writeTuyaDP(TUYA_DP.SENSITIVITY, newSettings[key]);
            break;
          case 'minimum_range':
            await this._writeTuyaDP(TUYA_DP.MINIMUM_RANGE, Math.round(newSettings[key] * 100));
            break;
          case 'maximum_range':
            await this._writeTuyaDP(TUYA_DP.MAXIMUM_RANGE, Math.round(newSettings[key] * 100));
            break;
          case 'fading_time':
            await this._writeTuyaDP(TUYA_DP.FADING_TIME, newSettings[key]);
            break;
          case 'relay_mode':
            if (newSettings[key] === 'always_on') {
              await this._setRelay(true);
            } else if (newSettings[key] === 'always_off') {
              await this._setRelay(false);
            }
            break;
        }
      } catch (err) {
        this.error(`[CEILING] Failed to apply setting ${key}:`, err.message);
      }
    }
  }

  onDeleted() {
    if (this._relayTimeout) {
      clearTimeout(this._relayTimeout);
    }
    this.log('[CEILING] Device deleted');
  }
}

module.exports = CeilingPresenceSensorDevice;

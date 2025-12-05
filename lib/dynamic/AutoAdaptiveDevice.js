'use strict';

const BaseHybridDevice = require('../devices/BaseHybridDevice');
const DynamicCapabilityManager = require('./DynamicCapabilityManager');
const DynamicFlowCardManager = require('./DynamicFlowCardManager');
const DynamicEnergyManager = require('./DynamicEnergyManager');
const SmartFlowManager = require('./SmartFlowManager');

/**
 * AutoAdaptiveDevice - v5.3.59
 *
 * Self-adapting device base class that:
 * 1. Auto-discovers capabilities from Tuya DPs
 * 2. Dynamically creates flow cards for new capabilities
 * 3. Smart energy monitoring and tracking
 * 4. Intelligent real-time flow triggering
 * 5. Learns device features over time
 * 6. Persists discoveries across restarts
 *
 * Usage:
 * class MyDevice extends AutoAdaptiveDevice {
 *   async onNodeInit({ zclNode }) {
 *     await super.onNodeInit({ zclNode });
 *     // Device is now fully self-adapting!
 *   }
 * }
 */
class AutoAdaptiveDevice extends BaseHybridDevice {

  /**
   * Initialize the auto-adaptive system
   * v5.4.3: Added rollback mechanism for failed pairing (fixes ghost devices)
   */
  async onNodeInit({ zclNode }) {
    // v5.3.63: Guard against double initialization (fixes MaxListenersExceeded)
    if (this._autoAdaptiveInited) {
      this.log('[AUTO-ADAPTIVE] ⚠️ Already initialized, skipping duplicate onNodeInit');
      return;
    }
    this._autoAdaptiveInited = true;

    this.log('═══════════════════════════════════════════════════════════════');
    this.log('[AUTO-ADAPTIVE] 🚀 Initializing FULL auto-adaptive system...');
    this.log('═══════════════════════════════════════════════════════════════');

    // v5.4.3: CRITICAL - Rollback device creation if init fails
    const pairingStartTime = Date.now();
    const PAIRING_TIMEOUT = 60000; // 60 seconds max for pairing

    try {
      // v5.3.61: CRITICAL - Migrate capabilities BEFORE super.onNodeInit()
      // This fixes "Invalid Capability" errors for existing devices
      await this._migrateManifestCapabilities();

      // v5.4.3: Validate capabilities BEFORE calling super.onNodeInit()
      const manifestCaps = this.driver?.manifest?.capabilities || [];
      const invalidCaps = [];

      for (const cap of manifestCaps) {
        if (!this._isValidCapability(cap)) {
          invalidCaps.push(cap);
        }
      }

      if (invalidCaps.length > 0) {
        throw new Error(`Invalid capabilities in manifest: ${invalidCaps.join(', ')}. Please check driver configuration.`);
      }

      // Initialize base first with timeout
      const initPromise = super.onNodeInit({ zclNode });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Pairing timeout after 60s')), PAIRING_TIMEOUT)
      );

      await Promise.race([initPromise, timeoutPromise]).catch(err => {
        this.error('[AUTO-ADAPTIVE] Base init error:', err.message);
        throw err; // Re-throw to trigger rollback
      });

    // Create ALL dynamic managers
    this.dynamicCapabilityManager = new DynamicCapabilityManager(this);
    this.dynamicFlowCardManager = new DynamicFlowCardManager(this);
    this.dynamicEnergyManager = new DynamicEnergyManager(this);
    this.smartFlowManager = new SmartFlowManager(this);

    // Initialize ALL managers
    await this.dynamicCapabilityManager.initialize();
    await this.dynamicFlowCardManager.initialize();
    await this.dynamicEnergyManager.initialize();
    await this.smartFlowManager.initialize();

    // Connect managers - when capability discovered, create flow cards
    this.dynamicCapabilityManager.on('capabilityDiscovered', async (data) => {
      await this.dynamicFlowCardManager.onCapabilityDiscovered(data);
    });

    this.dynamicCapabilityManager.on('valueChanged', async (data) => {
      await this.dynamicFlowCardManager.onValueChanged(data);
    });

    this.dynamicCapabilityManager.on('capabilityAdded', async (data) => {
      this.log(`[AUTO-ADAPTIVE] 🆕 New capability added: ${data.capability}`);
      await this._onNewCapabilityAdded(data.capability);
    });

    // Connect energy manager events
    this.dynamicEnergyManager.on('energyDiscovered', async (data) => {
      this.log(`[AUTO-ADAPTIVE] ⚡ Energy DP discovered: DP${data.dpId} → ${data.mapping.capability}`);
    });

    this.dynamicEnergyManager.on('energyChanged', async (data) => {
      await this.smartFlowManager.triggerFlow(`${data.capability}_changed`, { value: data.value });
    });

    this.dynamicEnergyManager.on('thresholdExceeded', async (data) => {
      this.log(`[AUTO-ADAPTIVE] ⚠️ Threshold exceeded: ${data.capability} = ${data.value} (${data.type})`);
      await this.smartFlowManager.triggerFlow(`${data.capability}_threshold_${data.type}`, data);
    });

    // Setup Tuya DP auto-discovery listener
    await this._setupAutoDiscoveryListener();

      // Log stats
      const flowStats = this.dynamicFlowCardManager.getStats();
      const energyStats = this.dynamicEnergyManager.getStats();
      const pairingDuration = Date.now() - pairingStartTime;
      this.log('[AUTO-ADAPTIVE] ═══════════════════════════════════════════════');
      this.log(`[AUTO-ADAPTIVE] ✅ FULL System Initialized! (${pairingDuration}ms)`);
      this.log(`[AUTO-ADAPTIVE]    📊 Discovered DPs: ${this.dynamicCapabilityManager.getDiscoveries().length}`);
      this.log(`[AUTO-ADAPTIVE]    🔔 Flow Triggers: ${flowStats.triggers}`);
      this.log(`[AUTO-ADAPTIVE]    ❓ Flow Conditions: ${flowStats.conditions}`);
      this.log(`[AUTO-ADAPTIVE]    ▶️ Flow Actions: ${flowStats.actions}`);
      this.log(`[AUTO-ADAPTIVE]    ⚡ Energy DPs: ${energyStats.discoveredDPs.length}`);
      this.log('[AUTO-ADAPTIVE] ═══════════════════════════════════════════════');

      // v5.4.3: Mark pairing as successful
      await this.setStoreValue('pairing_success', true);
      await this.setStoreValue('last_init_time', Date.now());

      // v5.4.3: PRIORITÉ 4 - Force device wake-up to prevent "NO DATA RECEIVED YET"
      await this._forceDeviceWakeUp();

    } catch (err) {
      // v5.4.3: CRITICAL - Rollback device creation on failure
      this.error('[AUTO-ADAPTIVE] ❌ INIT FAILED - Rolling back device creation');
      this.error('[AUTO-ADAPTIVE] Error:', err.message);
      this.error('[AUTO-ADAPTIVE] Stack:', err.stack);

      try {
        // Mark as failed to prevent ghost device
        await this.setStoreValue('pairing_failed', true);
        await this.setStoreValue('pairing_error', err.message);

        // Attempt to delete the device (cleanup ghost)
        this.log('[AUTO-ADAPTIVE] 🗑️ Cleaning up ghost device...');
        await this.setUnavailable(`Pairing failed: ${err.message}`);

        // Notify user with clear error
        const errorMsg = err.message.includes('Invalid Capability')
          ? 'Wrong driver selected - Please re-pair with correct driver'
          : `Pairing failed: ${err.message}`;

        throw new Error(errorMsg);
      } catch (cleanupErr) {
        this.error('[AUTO-ADAPTIVE] Cleanup error:', cleanupErr.message);
      }

      // Re-throw original error to prevent device from being added
      throw err;
    }
  }

  /**
   * v5.3.61: Migrate capabilities from driver manifest BEFORE super.onNodeInit()
   * This fixes "Invalid Capability" errors for existing devices
   */
  async _migrateManifestCapabilities() {
    try {
      const manifestCaps = this.driver?.manifest?.capabilities || [];
      if (manifestCaps.length === 0) {
        this.log('[MIGRATE] ⚠️ No capabilities in driver manifest');
        return;
      }

      let addedCount = 0;
      for (const cap of manifestCaps) {
        if (!this.hasCapability(cap)) {
          try {
            await this.addCapability(cap);
            addedCount++;
            this.log(`[MIGRATE] ➕ Added: ${cap}`);
          } catch (err) {
            // Skip if device is deleted or capability invalid
            if (!err.message?.includes('Not Found')) {
              this.log(`[MIGRATE] ⚠️ Could not add ${cap}: ${err.message}`);
            }
          }
        }
      }

      if (addedCount > 0) {
        this.log(`[MIGRATE] ✅ Added ${addedCount} missing capabilities`);
      }
    } catch (err) {
      this.error('[MIGRATE] Error:', err.message);
    }
  }

  /**
   * Setup listener for auto-discovering capabilities from Tuya DPs
   */
  async _setupAutoDiscoveryListener() {
    this.log('[AUTO-ADAPTIVE] Setting up auto-discovery listener...');

    // Listen to TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', async ({ dpId, value, dpType }) => {
        await this._onDPReceived(dpId, value, dpType);
      });
      this.log('[AUTO-ADAPTIVE] ✅ Listening to TuyaEF00Manager');
    }

    // Also setup direct cluster listener
    const endpoint = this.zclNode?.endpoints?.[1];
    if (endpoint) {
      // Find Tuya cluster
      const tuyaCluster = endpoint.clusters.tuya
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters['61184']
        || endpoint.clusters[61184];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('dataReport', (data) => {
          this._parseAndProcessTuyaData(data);
        });

        tuyaCluster.on('response', (data) => {
          this._parseAndProcessTuyaData(data);
        });

        this.log('[AUTO-ADAPTIVE] ✅ Listening to Tuya cluster directly');
      }

      // Raw frame listener for maximum compatibility
      if (typeof endpoint.on === 'function') {
        endpoint.on('frame', (frame) => {
          if (frame && (frame.cluster === 0xEF00 || frame.cluster === 61184)) {
            this._parseTuyaFrame(frame.data);
          }
        });
        this.log('[AUTO-ADAPTIVE] ✅ Listening to raw frames');
      }
    }
  }

  /**
   * Handle incoming DP - route to ALL managers
   * v5.3.62: Uses adaptive parsing from BaseHybridDevice
   */
  async _onDPReceived(dpId, value, dpType = null) {
    // v5.3.62: Use adaptive parsing for universal data handling
    const context = this._getDPContext(dpId);
    const parsed = this.parseData(value, context);

    this.log(`[AUTO-ADAPTIVE] 📥 DP${dpId}: raw=${JSON.stringify(value)} → parsed=${parsed.value} (type: ${parsed.type})`);

    // Convert value based on context
    let convertedValue = parsed.value;
    if (context.includes('temp')) {
      convertedValue = this.parseTemperature(parsed.value);
    } else if (context.includes('humid')) {
      convertedValue = this.parseHumidity(parsed.value);
    } else if (context.includes('battery')) {
      convertedValue = this.parseBattery(parsed.value);
    } else if (context.includes('illumin') || context.includes('lux')) {
      convertedValue = this.parseIlluminance(parsed.value);
    }

    try {
      // Process for capabilities with converted value
      const mapping = await this.dynamicCapabilityManager.processDP(dpId, convertedValue, dpType);

      // Process for energy (power, voltage, current, energy)
      if (this.dynamicEnergyManager) {
        await this.dynamicEnergyManager.processDP(dpId, convertedValue, dpType);
      }

      if (mapping) {
        // Also call device-specific handler if exists
        await this._handleDeviceSpecificDP(dpId, convertedValue, mapping);
      }
    } catch (err) {
      this.error('[AUTO-ADAPTIVE] DP processing error:', err.message);
    }
  }

  /**
   * v5.3.62: Get context hint for DP ID
   */
  _getDPContext(dpId) {
    const dpContexts = {
      1: 'temperature', 2: 'humidity', 3: 'temperature_soil', 4: 'battery',
      5: 'humidity_soil', 6: 'motion', 7: 'alarm_contact', 9: 'distance',
      14: 'battery_low', 15: 'battery', 18: 'temperature', 19: 'humidity',
      20: 'illuminance', 101: 'sensitivity', 102: 'illuminance_threshold',
      104: 'power', 105: 'current', 106: 'voltage', 107: 'energy'
    };
    return dpContexts[dpId] || `dp_${dpId}`;
  }

  /**
   * Parse and process Tuya data from various formats
   */
  _parseAndProcessTuyaData(data) {
    if (!data) return;

    // Try different formats
    const dp = data.dpId ?? data.dp ?? data.datapoint;
    const value = data.dpValue ?? data.value ?? data.data;
    const dpType = data.dpType ?? data.type;

    if (dp !== undefined && value !== undefined) {
      this._onDPReceived(dp, value, dpType);
    } else if (data.datapoints && Array.isArray(data.datapoints)) {
      for (const dpData of data.datapoints) {
        const dpId = dpData.dp ?? dpData.dpId;
        const dpValue = dpData.value ?? dpData.dpValue;
        const dpDataType = dpData.type ?? dpData.dpType;
        if (dpId !== undefined) {
          this._onDPReceived(dpId, dpValue, dpDataType);
        }
      }
    } else if (Buffer.isBuffer(data)) {
      this._parseTuyaFrame(data);
    }
  }

  /**
   * Parse raw Tuya frame buffer
   * Format: [status:1][transid:1][dp:1][type:1][len:2][value:N]...
   */
  _parseTuyaFrame(buffer) {
    if (!buffer || buffer.length < 6) return;

    try {
      let offset = 2; // Skip status and transid

      while (offset < buffer.length - 4) {
        const dp = buffer[offset];
        const type = buffer[offset + 1];
        const len = (buffer[offset + 2] << 8) | buffer[offset + 3];

        if (offset + 4 + len > buffer.length) break;

        const valueBuffer = buffer.slice(offset + 4, offset + 4 + len);
        let value;

        // Parse value based on type
        switch (type) {
          case 0: // Raw
            value = valueBuffer;
            break;
          case 1: // Bool
            value = valueBuffer[0] === 1;
            break;
          case 2: // Value (big-endian int)
            if (len === 1) value = valueBuffer[0];
            else if (len === 2) value = valueBuffer.readInt16BE(0);
            else if (len === 4) value = valueBuffer.readInt32BE(0);
            else value = valueBuffer.readIntBE(0, len);
            break;
          case 3: // String
            value = valueBuffer.toString('utf8');
            break;
          case 4: // Enum
            value = valueBuffer[0];
            break;
          default:
            value = valueBuffer;
        }

        this._onDPReceived(dp, value, type);
        offset += 4 + len;
      }
    } catch (err) {
      this.error('[AUTO-ADAPTIVE] Frame parse error:', err.message);
    }
  }

  /**
   * Override in subclass for device-specific DP handling
   */
  async _handleDeviceSpecificDP(dpId, value, mapping) {
    // Default: no-op, subclass can override
  }

  /**
   * Called when a new capability is dynamically added
   */
  async _onNewCapabilityAdded(capabilityId) {
    // Default: log it
    this.log(`[AUTO-ADAPTIVE] New capability ready: ${capabilityId}`);
  }

  /**
   * Get auto-discovery status for debugging
   */
  getAutoAdaptiveStatus() {
    const discoveries = this.dynamicCapabilityManager?.getDiscoveries() || [];
    const flowStats = this.dynamicFlowCardManager?.getStats() || {};

    return {
      initialized: !!this.dynamicCapabilityManager,
      discoveries: discoveries.map(d => ({
        dp: d.dpId,
        capability: d.capability,
        confidence: d.confidence,
        discoveredAt: d.discoveredAt
      })),
      flowCards: flowStats,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Force re-discovery of all DPs (useful after firmware update)
   */
  async resetDiscoveries() {
    this.log('[AUTO-ADAPTIVE] Resetting all discoveries...');
    await this.setStoreValue('dynamic_capabilities', {});
    this.dynamicCapabilityManager._discoveredDPs.clear();
    this.log('[AUTO-ADAPTIVE] ✅ Discoveries reset');
  }

  /**
   * Request all known DPs to trigger re-discovery
   */
  async requestAllDPs() {
    this.log('[AUTO-ADAPTIVE] Requesting all DPs...');

    if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestAllDPs === 'function') {
      await this.tuyaEF00Manager.requestAllDPs();
    }
  }

  /**
   * v5.4.3: PRIORITÉ 4 - Force device wake-up to receive initial data
   * Prevents "NO DATA RECEIVED YET" issues by actively requesting DPs
   */
  async _forceDeviceWakeUp() {
    this.log('[WAKE-UP] 🔔 Forcing device wake-up to request initial data...');

    try {
      // Method 1: Request all DPs via TuyaEF00Manager
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestAllDPs === 'function') {
        this.log('[WAKE-UP] Requesting all DPs via TuyaEF00Manager...');
        await this.tuyaEF00Manager.requestAllDPs();
      }

      // Method 2: Send customTuyaDataPointCommand to wake up device
      const endpoint = this.zclNode?.endpoints?.[1];
      if (endpoint) {
        const tuyaCluster = endpoint.clusters.tuya
          || endpoint.clusters.tuyaSpecific
          || endpoint.clusters.manuSpecificTuya
          || endpoint.clusters['61184']
          || endpoint.clusters[61184];

        if (tuyaCluster) {
          try {
            this.log('[WAKE-UP] Sending Tuya DP query command...');
            // Query common DPs: 1, 2, 3, 4, 5 (most devices use these)
            for (const dpId of [1, 2, 3, 4, 5]) {
              try {
                await tuyaCluster.readAttributes([`dp${dpId}`]).catch(() => {});
              } catch (e) {
                // Ignore read errors, some DPs might not exist
              }
            }
          } catch (err) {
            this.log('[WAKE-UP] ⚠️ Tuya cluster query failed:', err.message);
          }
        }
      }

      // Method 3: Read standard ZCL clusters as fallback
      if (endpoint) {
        this.log('[WAKE-UP] Reading standard ZCL clusters...');

        // Temperature
        if (endpoint.clusters.temperatureMeasurement) {
          await endpoint.clusters.temperatureMeasurement.readAttributes(['measuredValue']).catch(() => {});
        }

        // Humidity
        if (endpoint.clusters.relativeHumidity) {
          await endpoint.clusters.relativeHumidity.readAttributes(['measuredValue']).catch(() => {});
        }

        // Battery
        if (endpoint.clusters.powerConfiguration) {
          await endpoint.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']).catch(() => {});
        }

        // Illuminance
        if (endpoint.clusters.illuminanceMeasurement) {
          await endpoint.clusters.illuminanceMeasurement.readAttributes(['measuredValue']).catch(() => {});
        }
      }

      // Schedule periodic retry for 5 minutes if no data received
      this._scheduleDataCheckTimeout();

      this.log('[WAKE-UP] ✅ Wake-up commands sent');
    } catch (err) {
      this.error('[WAKE-UP] Error during wake-up:', err.message);
    }
  }

  /**
   * v5.4.3: Schedule timeout to check if data was received
   * If no data after 5 minutes, switch to "Tuya DP only" fallback mode
   */
  _scheduleDataCheckTimeout() {
    const DATA_CHECK_TIMEOUT = 300000; // 5 minutes

    this._dataCheckTimer = setTimeout(async () => {
      try {
        const discoveries = this.dynamicCapabilityManager?.getDiscoveries() || [];

        if (discoveries.length === 0) {
          this.log('[WAKE-UP] ⚠️ NO DATA RECEIVED after 5 minutes - Switching to fallback mode');

          // Enable "Tuya DP only" fallback mode
          await this.setStoreValue('tuya_dp_only_mode', true);

          // Set device as available but with warning
          await this.setAvailable();
          this.log('[WAKE-UP] Device set to available in fallback mode');
        } else {
          this.log(`[WAKE-UP] ✅ Data received! Discovered ${discoveries.length} DPs`);
        }
      } catch (err) {
        this.error('[WAKE-UP] Data check error:', err.message);
      }
    }, DATA_CHECK_TIMEOUT);
  }

  /**
   * v5.4.3: Validate capability ID against Homey's standard capabilities
   * Prevents "Invalid Capability" errors during pairing
   */
  _isValidCapability(capabilityId) {
    // Standard Homey capabilities (comprehensive list)
    const VALID_CAPABILITIES = [
      'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
      'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery',
      'measure_power', 'measure_voltage', 'measure_current', 'measure_pressure',
      'measure_co2', 'measure_pm25', 'measure_noise', 'measure_rain', 'measure_wind_strength',
      'measure_wind_angle', 'measure_gust_strength', 'measure_gust_angle',
      'alarm_motion', 'alarm_contact', 'alarm_tamper', 'alarm_water', 'alarm_fire',
      'alarm_smoke', 'alarm_co', 'alarm_co2', 'alarm_pm25', 'alarm_battery', 'alarm_heat',
      'alarm_generic', 'locked', 'lock_mode', 'windowcoverings_state', 'windowcoverings_set',
      'windowcoverings_tilt_set', 'button', 'speaker_playing', 'speaker_shuffle',
      'speaker_repeat', 'speaker_artist', 'speaker_album', 'speaker_track',
      'volume_set', 'volume_up', 'volume_down', 'volume_mute', 'channel_up', 'channel_down',
      'target_temperature', 'thermostat_mode', 'measure_water', 'meter_power',
      'meter_water', 'meter_gas', 'meter_rain', 'meter_battery', 'homealarm_state'
    ];

    // Custom/dynamic capabilities (tuya_dp_X, etc.) are also valid
    if (capabilityId.startsWith('tuya_dp_') || capabilityId.startsWith('custom_')) {
      return true;
    }

    return VALID_CAPABILITIES.includes(capabilityId);
  }

  /**
   * v5.4.3: PRIORITÉ 3 - Clean up ALL event listeners on device deletion
   * Fixes MaxListenersExceededWarning memory leaks
   */
  async onDeleted() {
    this.log('[AUTO-ADAPTIVE] 🗑️ Device deleted - Cleaning up listeners...');

    try {
      // Remove all listeners from managers
      if (this.dynamicCapabilityManager) {
        this.dynamicCapabilityManager._listeners?.clear();
      }

      if (this.dynamicFlowCardManager) {
        this.dynamicFlowCardManager._listeners?.clear();
      }

      if (this.dynamicEnergyManager) {
        this.dynamicEnergyManager._listeners?.clear();
      }

      if (this.smartFlowManager) {
        this.smartFlowManager._listeners?.clear();
      }

      // Remove TuyaEF00Manager listeners
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.removeAllListeners === 'function') {
        this.tuyaEF00Manager.removeAllListeners();
      }

      // Remove ZCL cluster listeners
      const endpoint = this.zclNode?.endpoints?.[1];
      if (endpoint) {
        const tuyaCluster = endpoint.clusters.tuya
          || endpoint.clusters.tuyaSpecific
          || endpoint.clusters.manuSpecificTuya
          || endpoint.clusters['61184']
          || endpoint.clusters[61184];

        if (tuyaCluster && typeof tuyaCluster.removeAllListeners === 'function') {
          tuyaCluster.removeAllListeners();
        }

        if (typeof endpoint.removeAllListeners === 'function') {
          endpoint.removeAllListeners('frame');
        }
      }

      // Clear wake-up data check timer (PRIORITÉ 4)
      if (this._dataCheckTimer) {
        clearTimeout(this._dataCheckTimer);
        this._dataCheckTimer = null;
      }

      this.log('[AUTO-ADAPTIVE] ✅ All listeners removed');
    } catch (err) {
      this.error('[AUTO-ADAPTIVE] Cleanup error:', err.message);
    }

    // Call parent onDeleted if it exists
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = AutoAdaptiveDevice;

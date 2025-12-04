'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * RainSensorDevice - v5.3.58 AUTO-ADAPTIVE VERSION
 *
 * NOW USES AutoAdaptiveDevice for guaranteed data reception!
 *
 * Tuya Rain/Water Leak Sensors typically use:
 * - DP 1: Rain/Water detected (boolean) → alarm_water
 * - DP 4 or DP 15: Battery level (%)
 * - DP 101: Sensitivity level (optional)
 *
 * Some devices may also use IAS Zone cluster (0x0500)
 *
 * v5.3.58: Switched to AutoAdaptiveDevice for multi-path DP listening
 */
class RainSensorDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           RAIN SENSOR v5.2.93 - UNKNOWN DEVICE HANDLING           ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Get device info from multiple sources
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData?.() || {};

    const modelId = settings.zb_modelId || store.modelId || data.modelId || 'unknown';
    const mfr = settings.zb_manufacturerName || store.manufacturerName || data.manufacturerName || 'unknown';

    this.log(`[INIT] Model: ${modelId}`);
    this.log(`[INIT] Manufacturer: ${mfr}`);

    // v5.2.93: Check if device is truly known
    this._isUnknownDevice = (modelId === 'unknown' || mfr === 'unknown');

    if (this._isUnknownDevice) {
      this.log('[INIT] ⚠️ ════════════════════════════════════════════════════════════');
      this.log('[INIT] ⚠️ UNKNOWN DEVICE - Cannot guarantee rain sensor functionality');
      this.log('[INIT] ⚠️ ════════════════════════════════════════════════════════════');
      this.log('[INIT] ℹ️ This device was paired but model/manufacturer are unknown.');
      this.log('[INIT] ℹ️ Rain detection may not work without a proper DP profile.');
      this.log('[INIT] ℹ️ Please enable DP logging and trigger the sensor to help us');
      this.log('[INIT] ℹ️ create a proper profile for this device.');
      this.log('[INIT] ⚠️ ════════════════════════════════════════════════════════════');
    }

    // Store for DP mapping
    this.setStoreValue('modelId', modelId).catch(() => { });
    this.setStoreValue('manufacturerName', mfr).catch(() => { });
    this.setStoreValue('isUnknownDevice', this._isUnknownDevice).catch(() => { });

    // Log available clusters
    this._logClusters(zclNode);

    // Initialize base (handles Tuya EF00 manager + battery)
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    // Setup rain-specific DP listener
    this._setupRainDPListener(zclNode);

    // Setup IAS Zone if available (some rain sensors use this)
    await this._setupIASZone(zclNode);

    // Log final status
    if (this._isUnknownDevice) {
      this.log('[INIT] ⚠️ RainSensorDevice initialized (UNKNOWN DEVICE - limited functionality)');
      this.log('[INIT] ℹ️ Waiting for DP data to learn device capabilities...');
    } else {
      this.log('[INIT] ✅ RainSensorDevice initialized');
    }
  }

  /**
   * Log available clusters for debugging
   */
  _logClusters(zclNode) {
    this.log('[CLUSTERS] ═══════════════════════════════════════════════════════');
    try {
      const endpoints = zclNode?.endpoints || {};
      for (const [epId, ep] of Object.entries(endpoints)) {
        const clusters = ep?.clusters || {};
        const clusterNames = Object.keys(clusters);
        this.log(`[CLUSTERS] Endpoint ${epId}: ${clusterNames.join(', ') || '(none)'}`);

        if (clusters.iasZone) this.log(`[CLUSTERS]   ✅ iasZone present`);
        if (clusters.tuya || clusters.manuSpecificTuya || clusters[61184]) {
          this.log(`[CLUSTERS]   ✅ Tuya cluster (0xEF00) present`);
        }
      }
    } catch (err) {
      this.log(`[CLUSTERS] Error:`, err.message);
    }
    this.log('[CLUSTERS] ═══════════════════════════════════════════════════════');
  }

  /**
   * Setup rain-specific DP listener
   */
  _setupRainDPListener(zclNode) {
    this.log('[RAIN-DP] Setting up rain sensor DP listener...');

    // Register custom DP handler with TuyaEF00Manager
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dp', (dpId, value) => {
        this._handleRainDP(dpId, value);
      });
      this.log('[RAIN-DP] ✅ Registered with TuyaEF00Manager');
    }

    // Also setup direct cluster listener as fallback
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.manuSpecificTuya || ep1?.clusters?.[61184];

      if (tuyaCluster) {
        // Listen for dataReport
        if (typeof tuyaCluster.on === 'function') {
          tuyaCluster.on('dataReport', (frame) => {
            this.log('[RAIN-DP] 📥 Raw dataReport:', JSON.stringify(frame));
            this._parseDataReport(frame);
          });
          this.log('[RAIN-DP] ✅ Direct cluster listener registered');
        }
      }
    } catch (err) {
      this.log('[RAIN-DP] Direct listener setup failed:', err.message);
    }

    // v5.2.96: Request initial DP1 (rain detection) with 30s retry
    this._requestInitialRainDP();
  }

  /**
   * v5.2.96: Request initial rain DP with retry logic
   * Battery devices may miss the first poll window
   */
  async _requestInitialRainDP() {
    this.log('[RAIN-DP] 📡 Requesting initial rain DP...');

    const requestDP1 = async () => {
      if (this.tuyaEF00Manager) {
        try {
          await this.tuyaEF00Manager.getData(1); // Rain detection
          this.log('[RAIN-DP] ✅ DP1 request sent');
        } catch (err) {
          this.log('[RAIN-DP] ⏳ DP1 timeout (normal for battery devices)');
        }
      }
    };

    // First attempt after 5s
    setTimeout(requestDP1, 5000);

    // Second attempt after 30s (catch missed poll window)
    setTimeout(async () => {
      // Only retry if no data received yet
      const lastUpdate = await this.getStoreValue('last_dp_update');
      if (!lastUpdate) {
        this.log('[RAIN-DP] 🔄 30s retry - no data received yet...');
        await requestDP1();
      }
    }, 30000);

    // Third attempt after 60s (final retry)
    setTimeout(async () => {
      const lastUpdate = await this.getStoreValue('last_dp_update');
      if (!lastUpdate) {
        this.log('[RAIN-DP] 🔄 60s final retry...');
        await requestDP1();
        this.log('[RAIN-DP] ⚠️ Device may be in deep sleep - will respond on next trigger');
      }
    }, 60000);
  }

  /**
   * Parse raw Tuya data report
   */
  _parseDataReport(frame) {
    try {
      const data = frame?.data || frame;
      if (!data || !data.length) return;

      // Tuya DP format: dpId (1), dataType (1), length (2), value (N)
      let offset = 0;
      while (offset < data.length - 4) {
        const dpId = data[offset];
        const dataType = data[offset + 1];
        const length = (data[offset + 2] << 8) | data[offset + 3];

        let value;
        if (length === 1) {
          value = data[offset + 4];
        } else if (length === 2) {
          value = (data[offset + 4] << 8) | data[offset + 5];
        } else if (length === 4) {
          value = (data[offset + 4] << 24) | (data[offset + 5] << 16) |
            (data[offset + 6] << 8) | data[offset + 7];
        } else {
          value = data.slice(offset + 4, offset + 4 + length);
        }

        this._handleRainDP(dpId, value);
        offset += 4 + length;
      }
    } catch (err) {
      this.log('[RAIN-DP] Parse error:', err.message);
    }
  }

  /**
   * Handle rain sensor DPs
   * Common mappings:
   * - DP 1: Rain/Water detected (boolean)
   * - DP 4: Battery (%)
   * - DP 15: Battery (%) - alternative
   * - DP 101: Sensitivity
   */
  _handleRainDP(dpId, value) {
    const now = Date.now();
    this.log('[RAIN-DP] ═══════════════════════════════════════════════════════');
    this.log(`[RAIN-DP] 📥 DP${dpId} = ${value} (type: ${typeof value})`);

    // Store timestamp
    this.setStoreValue('last_dp_update', now).catch(() => { });
    this.setStoreValue(`dp_${dpId}_time`, now).catch(() => { });
    this.setStoreValue(`dp_${dpId}_value`, value).catch(() => { });

    switch (dpId) {
      case 1: // Rain/Water detected
        const rainDetected = Boolean(value);
        this.log(`[RAIN-DP] 🌧️ Rain/Water: ${rainDetected ? 'DETECTED!' : 'clear'}`);

        if (this.hasCapability('alarm_water')) {
          this.setCapabilityValue('alarm_water', rainDetected)
            .then(() => this.log(`[RAIN-DP] ✅ alarm_water = ${rainDetected}`))
            .catch(err => this.error(`[RAIN-DP] ❌ Failed:`, err.message));
        }

        // Store last rain detection time
        if (rainDetected) {
          this.setStoreValue('last_rain_detected', now).catch(() => { });
        }
        break;

      case 4: // Battery (primary)
      case 15: // Battery (alternative)
        // Only treat as battery if value is in valid range (3-100%)
        if (value >= 3 && value <= 100) {
          this.log(`[RAIN-DP] 🔋 Battery (DP${dpId}): ${value}%`);

          if (this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', value)
              .then(() => this.log(`[RAIN-DP] ✅ measure_battery = ${value}%`))
              .catch(err => this.error(`[RAIN-DP] ❌ Failed:`, err.message));
          }

          // Mark that we received battery via DP
          this.setStoreValue('has_received_battery_dp', true).catch(() => { });
          this.setStoreValue('last_battery_percent', value).catch(() => { });
        }
        break;

      case 101: // Sensitivity level
        this.log(`[RAIN-DP] 📐 Sensitivity: ${value}`);
        this.setStoreValue('rain_sensitivity', value).catch(() => { });
        break;

      default:
        this.log(`[RAIN-DP] ❓ Unknown DP${dpId} = ${value}`);
    }
  }

  /**
   * Setup IAS Zone for rain/water detection (some sensors use this)
   */
  async _setupIASZone(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const iasZone = ep1?.clusters?.iasZone;

      if (!iasZone) {
        this.log('[IAS] No IAS Zone cluster available');
        return;
      }

      this.log('[IAS] Setting up IAS Zone for rain detection...');

      // Listen for zone status changes
      iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('[IAS] 📥 Zone status change:', JSON.stringify(payload));

        const zoneStatus = payload?.zoneStatus || 0;
        const alarm1 = !!(zoneStatus & 0x01); // Water/Rain detected

        this.log(`[IAS] 🌧️ Water alarm: ${alarm1 ? 'ACTIVE' : 'clear'}`);

        if (this.hasCapability('alarm_water')) {
          this.setCapabilityValue('alarm_water', alarm1)
            .then(() => this.log(`[IAS] ✅ alarm_water = ${alarm1}`))
            .catch(err => this.error(`[IAS] ❌ Failed:`, err.message));
        }
      };

      this.log('[IAS] ✅ IAS Zone listener registered');

    } catch (err) {
      this.log('[IAS] Setup failed:', err.message);
    }
  }

  async onDeleted() {
    this.log('RainSensorDevice deleted');
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = RainSensorDevice;

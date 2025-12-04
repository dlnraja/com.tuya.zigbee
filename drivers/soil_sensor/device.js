'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * Soil Sensor Device - v5.3.58 AUTO-ADAPTIVE VERSION
 *
 * NOW USES AutoAdaptiveDevice for guaranteed data reception!
 *
 * Supported Manufacturers:
 * - _TZE284_oitavov2 (Primary)
 * - _TZE200_myd45weu, _TZE284_myd45weu, etc.
 *
 * Protocol: Tuya DataPoints (DP) over cluster 0xEF00
 *
 * Known DP Mappings (from Zigbee2MQTT):
 * - DP 3: Soil Moisture (%)
 * - DP 5: Temperature (value / 10)
 * - DP 9: Temperature unit
 * - DP 14: Battery state (enum)
 * - DP 15: Battery (%)
 *
 * v5.3.58: Switched to AutoAdaptiveDevice for multi-path DP listening
 */
class SoilSensorDevice extends AutoAdaptiveDevice {

  // Force mains powered = false for soil sensors
  get mainsPowered() { return false; }

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════');
    this.log('[SOIL-SENSOR] Initializing...');
    this.log('═══════════════════════════════════════════════════');

    // Initialize base (power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Store DP values for debugging
    this._dpValues = {};
    this._dpLastUpdate = null;

    // Setup Tuya DP listener
    await this._setupTuyaDPListener();

    // Request initial data
    this._requestInitialDPs();

    // v5.2.87: Re-register DP listeners after TuyaEF00Manager background init completes
    setTimeout(() => {
      if (this.tuyaEF00Manager?.dpMappings || this.tuyaEF00Manager?._isInitialized) {
        this.log('[SOIL-SENSOR] 📡 Re-registering DP listeners after background init');
        this._registerDPFromManager();
      }
    }, 6000);

    // v5.2.78: Explain battery device behavior to user
    this.log('[SOIL-SENSOR] ✅ Initialized');
    this.log('[SOIL-SENSOR] ℹ️ Battery device - may not respond to active queries');
    this.log('[SOIL-SENSOR] ℹ️ Data will arrive when device wakes up (every 15-60 minutes)');
    this.log('[SOIL-SENSOR] ℹ️ First data may take up to 1 hour after pairing');

    // v5.2.79: Data watchdog - alert if no data after 30 minutes
    this._startDataWatchdog();
  }

  /**
   * v5.2.79: Start data watchdog timer
   * Alerts user if no DP data received after timeout
   */
  _startDataWatchdog() {
    const WATCHDOG_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    this._watchdogTimer = this.homey.setTimeout(() => {
      if (!this._dpLastUpdate) {
        this.log('[SOIL-SENSOR] ⚠️ ════════════════════════════════════════════════════════');
        this.log('[SOIL-SENSOR] ⚠️ NO DATA RECEIVED after 30 minutes!');
        this.log('[SOIL-SENSOR] ⚠️ ════════════════════════════════════════════════════════');
        this.log('[SOIL-SENSOR] ℹ️ Possible causes:');
        this.log('[SOIL-SENSOR]    1. Sensor is still sleeping (battery conservation)');
        this.log('[SOIL-SENSOR]    2. Sensor is out of Zigbee range');
        this.log('[SOIL-SENSOR]    3. Sensor battery is depleted');
        this.log('[SOIL-SENSOR] ℹ️ Try:');
        this.log('[SOIL-SENSOR]    - Press the sensor button briefly to wake it');
        this.log('[SOIL-SENSOR]    - Move sensor closer to Homey or a Zigbee router');
        this.log('[SOIL-SENSOR]    - Check/replace the battery');
        this.log('[SOIL-SENSOR] ⚠️ ════════════════════════════════════════════════════════');
      } else {
        const elapsed = Date.now() - this._dpLastUpdate;
        this.log(`[SOIL-SENSOR] ✅ Data watchdog OK - last update ${Math.round(elapsed / 1000)}s ago`);
      }
    }, WATCHDOG_TIMEOUT);
  }

  /**
   * Setup Tuya DP listener for cluster 0xEF00
   * v5.2.75: Enhanced listener setup - multiple fallback methods
   * v5.2.79: Added better error handling and logging
   */
  async _setupTuyaDPListener() {
    this.log('[SOIL-SENSOR] ════════════════════════════════════════════════════════');
    this.log('[SOIL-SENSOR] Setting up Tuya DP listener...');
    this.log('[SOIL-SENSOR] ════════════════════════════════════════════════════════');

    let listenerCount = 0;

    try {

      // Method 1: TuyaEF00Manager dpReport event
      if (this.tuyaEF00Manager) {
        this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
          this.log(`[SOIL-SENSOR] 📥 TuyaEF00Manager dpReport: DP${dpId} = ${value}`);
          this._handleSoilDP(dpId, value);
        });
        listenerCount++;
        this.log('[SOIL-SENSOR] ✅ TuyaEF00Manager dpReport listener registered');
      }

      // Method 2: TuyaEF00Manager individual DP events (dp-1, dp-2, etc.)
      if (this.tuyaEF00Manager) {
        const dpIds = [1, 2, 3, 4, 5, 6, 7, 14, 15, 101];
        dpIds.forEach(dpId => {
          this.tuyaEF00Manager.on(`dp-${dpId}`, (value) => {
            this.log(`[SOIL-SENSOR] 📥 TuyaEF00Manager dp-${dpId}: ${value}`);
            this._handleSoilDP(dpId, value);
          });
        });
        listenerCount++;
        this.log('[SOIL-SENSOR] ✅ TuyaEF00Manager individual DP listeners registered');
      }

      // Method 3: Direct cluster listener (fallback)
      const endpoint = this.zclNode?.endpoints?.[1];
      if (endpoint) {
        // Find Tuya cluster by various names
        const tuyaCluster = endpoint.clusters.tuya
          || endpoint.clusters.tuyaSpecific
          || endpoint.clusters.manuSpecificTuya
          || endpoint.clusters[61184]
          || endpoint.clusters['61184'];

        if (tuyaCluster) {
          // dataReport event
          if (typeof tuyaCluster.on === 'function') {
            tuyaCluster.on('dataReport', (data) => {
              this.log('[SOIL-SENSOR] 📥 Direct dataReport:', JSON.stringify(data));
              this._parseTuyaRawData(data);
            });
            listenerCount++;
          }

          // onDataReport property
          const originalHandler = tuyaCluster.onDataReport;
          tuyaCluster.onDataReport = (data) => {
            this.log('[SOIL-SENSOR] 📥 Direct onDataReport:', JSON.stringify(data));
            this._parseTuyaRawData(data);
            if (originalHandler) originalHandler.call(tuyaCluster, data);
          };
          listenerCount++;

          this.log('[SOIL-SENSOR] ✅ Direct Tuya cluster listeners configured');
        } else {
          this.log('[SOIL-SENSOR] ⚠️ No Tuya cluster found on endpoint 1');
        }
      }

      // Method 4: ZCL raw frame listener (last resort)
      if (this.zclNode) {
        this.zclNode.on('frame', (endpointId, clusterId, frame, meta) => {
          if (clusterId === 0xEF00 || clusterId === 61184) {
            this.log('[SOIL-SENSOR] 📥 ZCL frame on 0xEF00:', JSON.stringify(frame));
            this._parseTuyaRawFrame(frame);
          }
        });
        listenerCount++;
        this.log('[SOIL-SENSOR] ✅ ZCL raw frame listener registered');
      }

      this.log(`[SOIL-SENSOR] 📡 Total listeners registered: ${listenerCount}`);

      if (listenerCount === 0) {
        this.log('[SOIL-SENSOR] ❌ NO LISTENERS - device may not report data!');
        this.log('[SOIL-SENSOR] ℹ️ This may be normal for passive Tuya DP devices');
        this.log('[SOIL-SENSOR] ℹ️ Data will arrive when device wakes up');
      } else {
        this.log('[SOIL-SENSOR] ✅ Listeners ready - waiting for device data...');
      }
    } catch (err) {
      this.error('[SOIL-SENSOR] ❌ Listener setup error:', err.message);
      this.log('[SOIL-SENSOR] ℹ️ Will rely on TuyaEF00Manager for data reception');
    }

    this.log('[SOIL-SENSOR] ════════════════════════════════════════════════════════');
  }

  /**
   * v5.2.87: Register DP handlers from TuyaEF00Manager after it's initialized
   */
  _registerDPFromManager() {
    if (!this.tuyaEF00Manager) return;

    // Re-register dpReport listener
    this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
      this.log(`[SOIL-SENSOR] 📥 Delayed dpReport: DP${dpId} = ${value}`);
      this._handleSoilDP(dpId, value);
    });

    // Also listen to individual DP events
    const dpIds = [1, 2, 3, 4, 5, 6, 7, 14, 15, 101];
    dpIds.forEach(dp => {
      this.tuyaEF00Manager.on(`dp-${dp}`, (value) => {
        this.log(`[SOIL-SENSOR] 📥 Delayed dp-${dp}: ${value}`);
        this._handleSoilDP(dp, value);
      });
    });

    this.log('[SOIL-SENSOR] ✅ DP listeners registered from TuyaEF00Manager');
  }

  /**
   * Parse raw Tuya data from various formats
   */
  _parseTuyaRawData(data) {
    if (!data) return;

    // Handle different data formats
    if (data.dp !== undefined && data.value !== undefined) {
      this._handleSoilDP(data.dp, data.value);
    } else if (data.dpId !== undefined && data.dpValue !== undefined) {
      this._handleSoilDP(data.dpId, data.dpValue);
    } else if (Array.isArray(data)) {
      // Array of DPs
      data.forEach(item => {
        if (item.dp !== undefined && item.value !== undefined) {
          this._handleSoilDP(item.dp, item.value);
        }
      });
    }
  }

  /**
   * Parse raw ZCL frame for Tuya DP data
   */
  _parseTuyaRawFrame(frame) {
    try {
      if (!frame || !frame.data) return;

      const buf = Buffer.from(frame.data);
      if (buf.length < 6) return;

      // Tuya frame format: seq(2) + cmd(1) + dpId(1) + dpType(1) + len(2) + data(n)
      let offset = 0;
      while (offset + 4 < buf.length) {
        const dpId = buf.readUInt8(offset + 2);
        const dpType = buf.readUInt8(offset + 3);
        const dpLen = buf.readUInt16BE(offset + 4);

        if (offset + 6 + dpLen > buf.length) break;

        let value;
        if (dpLen === 1) {
          value = buf.readUInt8(offset + 6);
        } else if (dpLen === 2) {
          value = buf.readUInt16BE(offset + 6);
        } else if (dpLen === 4) {
          value = buf.readUInt32BE(offset + 6);
        }

        if (value !== undefined) {
          this.log(`[SOIL-SENSOR] 📥 Parsed frame: DP${dpId} type=${dpType} len=${dpLen} value=${value}`);
          this._handleSoilDP(dpId, value);
        }

        offset += 6 + dpLen;
      }
    } catch (err) {
      this.log('[SOIL-SENSOR] Frame parse error:', err.message);
    }
  }

  /**
   * Handle incoming Tuya DP
   */
  _handleSoilDP(dpId, value) {
    this.log(`[SOIL-SENSOR] 📊 DP${dpId} = ${value}`);

    // Store for debugging
    this._dpValues[dpId] = value;
    this._dpLastUpdate = Date.now();

    // DP Mapping (comprehensive for multiple manufacturers)
    switch (dpId) {
      // Temperature variants
      case 1:
      case 3:
      case 5:
        this._setTemperature(value);
        break;

      // Humidity / Soil Moisture variants
      case 2:
      case 4:
      case 6:
      case 7:
        this._setHumidity(value);
        break;

      // Battery variants
      case 14:
      case 15:
      case 101:
        this._setBattery(value);
        break;

      default:
        this.log(`[SOIL-SENSOR] ❓ Unknown DP${dpId} = ${value}`);
    }
  }

  /**
   * Set temperature capability
   */
  _setTemperature(value) {
    // Most Tuya temp sensors send value * 10
    let temp = value;
    if (value > 100 || value < -100) {
      temp = value / 10;
    }
    this.log(`[SOIL-SENSOR] 🌡️ Temperature: ${temp}°C`);

    if (this.hasCapability('measure_temperature')) {
      this.setCapabilityValue('measure_temperature', temp).catch(this.error);
    }
  }

  /**
   * Set humidity/soil moisture capability
   */
  _setHumidity(value) {
    // Ensure 0-100 range
    const humidity = Math.min(100, Math.max(0, value));
    this.log(`[SOIL-SENSOR] 💧 Humidity/Moisture: ${humidity}%`);

    if (this.hasCapability('measure_humidity')) {
      this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
    }
  }

  /**
   * Set battery capability
   */
  _setBattery(value) {
    // Ensure 0-100 range
    const battery = Math.min(100, Math.max(0, value));
    this.log(`[SOIL-SENSOR] 🔋 Battery: ${battery}%`);

    if (this.hasCapability('measure_battery')) {
      this.setCapabilityValue('measure_battery', battery).catch(this.error);
    }

    // Forward to BatteryManager if available
    if (this.batteryManager && typeof this.batteryManager.onTuyaDPBattery === 'function') {
      this.batteryManager.onTuyaDPBattery({ dpId: 14, value: battery });
    }
  }

  /**
   * Request initial DP values
   */
  _requestInitialDPs() {
    // Schedule DP request after device is fully initialized
    setTimeout(() => {
      this.log('[SOIL-SENSOR] 📤 Requesting initial DP values...');

      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDPs === 'function') {
        this.tuyaEF00Manager.requestDPs([1, 2, 3, 4, 5, 6, 7, 14, 15, 101]);
      }
    }, 5000);
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      dpValues: this._dpValues,
      lastUpdate: this._dpLastUpdate ? new Date(this._dpLastUpdate).toISOString() : 'never',
      capabilities: {
        temperature: this.getCapabilityValue('measure_temperature'),
        humidity: this.getCapabilityValue('measure_humidity'),
        battery: this.getCapabilityValue('measure_battery')
      }
    };
  }

  async onDeleted() {
    this.log('[SOIL-SENSOR] Device deleted');
    await super.onDeleted().catch(() => { });
  }
}

module.exports = SoilSensorDevice;

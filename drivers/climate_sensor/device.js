'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const DeviceFingerprintDB = require('../../lib/tuya/DeviceFingerprintDB');

/**
 * Climate Sensor Device - Enhanced TS0601 Support
 *
 * Supported Manufacturers (from DeviceFingerprintDB):
 * - _TZE284_vvmbj46n (ZTH05Z)
 * - _TZE200_vvmbj46n (ZTH05)
 * - _TZE284_znlqjmih
 *
 * Protocol: Tuya DataPoints (DP) over cluster 0xEF00
 *
 * Full DP Mapping from Zigbee2MQTT:
 * - DP 1:  Temperature (value ÷ 10) °C
 * - DP 2:  Humidity (%)
 * - DP 4:  Battery (%)
 * - DP 9:  Temperature unit (celsius/fahrenheit)
 * - DP 10: Max temperature alarm (÷10)
 * - DP 11: Min temperature alarm (÷10)
 * - DP 12: Max humidity alarm
 * - DP 13: Min humidity alarm
 * - DP 14: Temperature alarm (lower_alarm/upper_alarm/cancel)
 * - DP 15: Humidity alarm (lower_alarm/upper_alarm/cancel)
 * - DP 17: Temperature periodic report (min, 1-120)
 * - DP 18: Humidity periodic report (min, 1-120)
 * - DP 19: Temperature sensitivity (÷10, 0.3-1)
 * - DP 20: Humidity sensitivity (3-10)
 */
class ClimateSensorDevice extends BaseHybridDevice {

  // Force battery powered
  get mainsPowered() { return false; }

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════');
    this.log('[CLIMATE-SENSOR] Initializing...');
    this.log('═══════════════════════════════════════════════════');

    // Initialize base (power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Get manufacturer name and model
    const mfr = this.getSetting('zb_manufacturerName') || '_TZE284_vvmbj46n';
    const modelId = this.getSetting('zb_modelId') || 'TS0601';
    this.log(`[CLIMATE-SENSOR] Manufacturer: ${mfr}, Model: ${modelId}`);

    // Get fingerprint from enriched database
    this._fingerprint = DeviceFingerprintDB.getFingerprint(mfr);
    if (this._fingerprint) {
      this.log(`[CLIMATE-SENSOR] 📋 Using fingerprint: ${this._fingerprint.productNames?.join(', ') || 'Climate Sensor'}`);
    }

    // Detect device type: TS0201/SONOFF use standard ZCL, TS0601 uses Tuya DP
    // v5.2.69: Added SONOFF SNZB-02/02D/02P detection
    // v5.2.81: Added HYBRID mode for TS0601 with standard clusters!
    const isSONOFF = mfr === 'SONOFF' || mfr === 'eWeLink' || modelId.startsWith('SNZB');
    const isStandardZCL = modelId === 'TS0201' || modelId.startsWith('TS02') || isSONOFF;

    // v5.2.88: CRITICAL FIX - Check _isPureTuyaDP from base class
    // TS0601/_TZE devices advertise phantom ZCL clusters that DON'T RESPOND!
    // We must NOT try ZCL for these devices or we get timeouts
    const isPureTuyaDP = this._isPureTuyaDP || modelId === 'TS0601' || mfr.startsWith('_TZE');

    // v5.2.81: Check if TS0601 has standard clusters available (HYBRID mode)
    // v5.2.88: BUT only use HYBRID mode if NOT a pure Tuya DP device!
    const endpoint = zclNode?.endpoints?.[1];
    const hasStandardTemp = !!(endpoint?.clusters?.temperatureMeasurement || endpoint?.clusters?.msTemperatureMeasurement);
    const hasStandardHumidity = !!(endpoint?.clusters?.relativeHumidity || endpoint?.clusters?.msRelativeHumidity);
    const hasStandardBattery = !!(endpoint?.clusters?.powerConfiguration || endpoint?.clusters?.genPowerCfg);

    // v5.2.88: HYBRID mode is DISABLED for pure Tuya DP devices!
    // These phantom clusters cause timeouts and don't provide data
    const isTS0601WithStandardClusters = false; // DISABLED - was causing all the timeouts!

    this._isStandardZCL = isStandardZCL && !isPureTuyaDP;
    this._isHybridMode = false; // v5.2.88: DISABLED - phantom clusters don't work

    if (isPureTuyaDP) {
      this.log('[CLIMATE-SENSOR] ════════════════════════════════════════════════════════');
      this.log('[CLIMATE-SENSOR] 🔶 PURE TUYA DP DEVICE DETECTED!');
      this.log('[CLIMATE-SENSOR] ════════════════════════════════════════════════════════');
      this.log(`[CLIMATE-SENSOR] Model: ${modelId}, Manufacturer: ${mfr}`);
      this.log('[CLIMATE-SENSOR] ⚠️ Standard clusters are PHANTOM (advertised but don\'t respond)');
      this.log('[CLIMATE-SENSOR] ⚠️ Skipping ALL ZCL operations to avoid timeouts!');
      this.log('[CLIMATE-SENSOR] ✅ Using Tuya DP protocol exclusively');
    } else if (isStandardZCL) {
      this.log(`[CLIMATE-SENSOR] Protocol: Standard ZCL${isSONOFF ? ' (SONOFF)' : ''}`);
    }

    // v5.2.88: ONLY use ZCL for non-Tuya devices (TS0201, SONOFF, etc.)
    if (isStandardZCL && !isPureTuyaDP) {
      // TS0201 or SONOFF: Use standard ZCL clusters
      await this._setupStandardZCLListeners();
    } else {
      // TS0601: Pure Tuya DP protocol (no standard clusters available)
      this._dpValues = {};
      this._dpLastUpdate = null;

      // v5.2.87: Wait for TuyaEF00Manager to be initialized before setting up listeners
      // The base class initializes it in background, so we need to wait or retry
      this.log('[CLIMATE-SENSOR] 🔄 Waiting for TuyaEF00Manager initialization...');

      // Setup DP listener with retry
      const setupWithRetry = async (attempts = 0) => {
        if (this.tuyaEF00Manager?._isInitialized || this.tuyaEF00Manager?.dpMappings) {
          this.log('[CLIMATE-SENSOR] ✅ TuyaEF00Manager ready - setting up listeners');
          await this._setupTuyaDPListener();
          this._requestInitialDPs();
        } else if (attempts < 10) {
          // Wait and retry (up to 10 seconds)
          setTimeout(() => setupWithRetry(attempts + 1), 1000);
        } else {
          // Fallback: setup anyway with direct cluster listener
          this.log('[CLIMATE-SENSOR] ⚠️ TuyaEF00Manager not ready - using direct cluster listener');
          await this._setupTuyaDPListener();
          this._requestInitialDPs();
        }
      };

      // Start immediately and also schedule retry
      await this._setupTuyaDPListener();
      this._requestInitialDPs();

      // Also listen for background init completion
      setTimeout(() => {
        if (this.tuyaEF00Manager?.dpMappings) {
          this.log('[CLIMATE-SENSOR] 📡 Re-registering DP listeners after background init');
          this._registerDPFromManager();
        }
      }, 6000);
    }

    this.log('[CLIMATE-SENSOR] ✅ Initialized');
  }

  /**
   * v5.2.87: Register DP handlers from TuyaEF00Manager after it's initialized
   */
  _registerDPFromManager() {
    if (!this.tuyaEF00Manager) return;

    // Re-register dpReport listener
    this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
      this._handleClimateDP(dpId, value);
    });

    // Also listen to individual DP events
    [1, 2, 4, 9, 14, 15].forEach(dp => {
      this.tuyaEF00Manager.on(`dp-${dp}`, (value) => {
        this.log(`[CLIMATE-SENSOR] 📥 DP${dp} event: ${value}`);
        this._handleClimateDP(dp, value);
      });
    });

    this.log('[CLIMATE-SENSOR] ✅ DP listeners registered from TuyaEF00Manager');
  }

  /**
   * Setup standard ZCL cluster listeners for TS0201 and HYBRID TS0601 devices
   * Uses msTemperatureMeasurement (0x0402), msRelativeHumidity (0x0405), genPowerCfg (0x0001)
   * v5.2.81: Also used for TS0601 devices with standard clusters available
   */
  async _setupStandardZCLListeners() {
    const mode = this._isHybridMode ? 'HYBRID TS0601' : 'standard ZCL';
    this.log(`[CLIMATE-SENSOR] Setting up ${mode} listeners...`);

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[CLIMATE-SENSOR] ⚠️ No endpoint 1 found');
      return;
    }

    // Temperature cluster (0x0402)
    const tempCluster = endpoint.clusters?.temperatureMeasurement || endpoint.clusters?.msTemperatureMeasurement;
    if (tempCluster) {
      this.log('[CLIMATE-SENSOR] ✅ Temperature cluster found');
      try {
        // Read initial value
        const tempData = await tempCluster.readAttributes(['measuredValue']).catch(() => null);
        if (tempData?.measuredValue != null) {
          const temp = Math.round((tempData.measuredValue / 100) * 10) / 10;
          this.log(`[CLIMATE-SENSOR] 🌡️ Initial temperature: ${temp}°C`);
          if (this.hasCapability('measure_temperature')) {
            await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          }
        }

        // Setup reporting
        if (typeof tempCluster.configureReporting === 'function') {
          await tempCluster.configureReporting({
            measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 10 }
          }).catch(err => this.log('[CLIMATE-SENSOR] Temperature reporting config failed:', err.message));
        }

        // Listen for reports
        tempCluster.on('attr.measuredValue', (value) => {
          const temp = Math.round((value / 100) * 10) / 10;
          this.log(`[CLIMATE-SENSOR] 🌡️ Temperature report: ${temp}°C`);
          if (this.hasCapability('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          }
        });
      } catch (err) {
        this.log('[CLIMATE-SENSOR] Temperature setup error:', err.message);
      }
    }

    // Humidity cluster (0x0405)
    const humCluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.msRelativeHumidity;
    if (humCluster) {
      this.log('[CLIMATE-SENSOR] ✅ Humidity cluster found');
      try {
        // Read initial value
        const humData = await humCluster.readAttributes(['measuredValue']).catch(() => null);
        if (humData?.measuredValue != null) {
          const hum = Math.round(humData.measuredValue / 100);
          this.log(`[CLIMATE-SENSOR] 💧 Initial humidity: ${hum}%`);
          if (this.hasCapability('measure_humidity')) {
            await this.setCapabilityValue('measure_humidity', hum).catch(this.error);
          }
        }

        // Setup reporting
        if (typeof humCluster.configureReporting === 'function') {
          await humCluster.configureReporting({
            measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 100 }
          }).catch(err => this.log('[CLIMATE-SENSOR] Humidity reporting config failed:', err.message));
        }

        // Listen for reports
        humCluster.on('attr.measuredValue', (value) => {
          const hum = Math.round(value / 100);
          this.log(`[CLIMATE-SENSOR] 💧 Humidity report: ${hum}%`);
          if (this.hasCapability('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', hum).catch(this.error);
          }
        });
      } catch (err) {
        this.log('[CLIMATE-SENSOR] Humidity setup error:', err.message);
      }
    }

    // Battery cluster (0x0001 genPowerCfg)
    const powerCluster = endpoint.clusters?.powerConfiguration || endpoint.clusters?.genPowerCfg;
    if (powerCluster) {
      this.log('[CLIMATE-SENSOR] ✅ Power/Battery cluster found');
      try {
        // Read initial battery
        const batteryData = await powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(() => null);
        if (batteryData?.batteryPercentageRemaining != null) {
          const battery = Math.round(batteryData.batteryPercentageRemaining / 2);
          this.log(`[CLIMATE-SENSOR] 🔋 Initial battery: ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        } else if (batteryData?.batteryVoltage != null) {
          // Fallback to voltage
          const voltage = batteryData.batteryVoltage / 10;
          const battery = Math.max(0, Math.min(100, Math.round((voltage - 2.0) / 1.2 * 100)));
          this.log(`[CLIMATE-SENSOR] 🔋 Initial battery (from voltage ${voltage}V): ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        }

        // Setup battery reporting
        if (typeof powerCluster.configureReporting === 'function') {
          await powerCluster.configureReporting({
            batteryPercentageRemaining: { minInterval: 3600, maxInterval: 43200, minChange: 2 }
          }).catch(err => this.log('[CLIMATE-SENSOR] Battery reporting config failed:', err.message));
        }

        // Listen for battery reports
        powerCluster.on('attr.batteryPercentageRemaining', (value) => {
          const battery = Math.round(value / 2);
          this.log(`[CLIMATE-SENSOR] 🔋 Battery report: ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        });
      } catch (err) {
        this.log('[CLIMATE-SENSOR] Battery setup error:', err.message);
      }
    } else {
      this.log('[CLIMATE-SENSOR] ⚠️ No battery cluster found - device may not report battery');
    }

    this.log('[CLIMATE-SENSOR] ✅ Standard ZCL listeners configured');
  }

  /**
   * Setup Tuya DP listener for cluster 0xEF00
   */
  async _setupTuyaDPListener() {
    this.log('[CLIMATE-SENSOR] Setting up Tuya DP listener...');

    // Listen for dpReport events from TuyaEF00Manager (if integrated)
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleClimateDP(dpId, value);
      });
      this.log('[CLIMATE-SENSOR] ✅ Using TuyaEF00Manager for DP handling');
      return;
    }

    // Fallback: Direct cluster listener
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[CLIMATE-SENSOR] ⚠️ No endpoint 1 found');
      return;
    }

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters.tuya
      || endpoint.clusters.tuyaSpecific
      || endpoint.clusters.manuSpecificTuya
      || endpoint.clusters[61184];

    if (tuyaCluster) {
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('dataReport', (data) => {
          this.log('[CLIMATE-SENSOR] 📥 Raw dataReport:', JSON.stringify(data));
          if (data && data.dp !== undefined) {
            this._handleClimateDP(data.dp, data.value);
          }
        });
      }

      tuyaCluster.onDataReport = (data) => {
        if (data && data.dp !== undefined) {
          this._handleClimateDP(data.dp, data.value);
        }
      };

      this.log('[CLIMATE-SENSOR] ✅ Direct Tuya cluster listener configured');
    } else {
      this.log('[CLIMATE-SENSOR] ⚠️ No Tuya cluster found');
    }
  }

  /**
   * Handle incoming Tuya DP using enriched fingerprint
   */
  _handleClimateDP(dpId, value) {
    this.log(`[CLIMATE-SENSOR] 📊 DP${dpId} = ${value}`);

    // Store for debugging
    this._dpValues[dpId] = value;
    this._dpLastUpdate = Date.now();

    // Use fingerprint for conversion if available
    const mfr = this.getSetting('zb_manufacturerName') || '_TZE284_vvmbj46n';
    const convertedValue = DeviceFingerprintDB.convertDPValue(mfr, dpId, value);

    // DP Mapping (comprehensive)
    switch (dpId) {
      case 1: // Temperature (÷10)
        this._setTemperature(value);
        break;

      case 2: // Humidity
        this._setHumidity(value);
        break;

      case 4: // Battery
        this._setBattery(value);
        break;

      case 9: // Temperature unit
        this.log(`[CLIMATE-SENSOR] 🌡️ Unit: ${value === 0 ? 'Celsius' : 'Fahrenheit'}`);
        break;

      case 10: // Max temp alarm
      case 11: // Min temp alarm
        this.log(`[CLIMATE-SENSOR] ⚠️ Temp alarm ${dpId === 10 ? 'max' : 'min'}: ${value / 10}°C`);
        break;

      case 12: // Max humidity alarm
      case 13: // Min humidity alarm
        this.log(`[CLIMATE-SENSOR] ⚠️ Humidity alarm ${dpId === 12 ? 'max' : 'min'}: ${value}%`);
        break;

      case 14: // Temperature alarm state
      case 15: // Humidity alarm state
        const alarmStates = ['lower_alarm', 'upper_alarm', 'cancel'];
        this.log(`[CLIMATE-SENSOR] 🚨 ${dpId === 14 ? 'Temp' : 'Humidity'} alarm: ${alarmStates[value] || value}`);
        break;

      case 17: // Temp report interval
      case 18: // Humidity report interval
        this.log(`[CLIMATE-SENSOR] ⏱️ ${dpId === 17 ? 'Temp' : 'Humidity'} report interval: ${value} min`);
        break;

      case 19: // Temp sensitivity
        this.log(`[CLIMATE-SENSOR] 📐 Temp sensitivity: ${value / 10}°C`);
        break;

      case 20: // Humidity sensitivity
        this.log(`[CLIMATE-SENSOR] 📐 Humidity sensitivity: ${value}%`);
        break;

      default:
        this.log(`[CLIMATE-SENSOR] ❓ Unknown DP${dpId} = ${value}`);
    }
  }

  /**
   * Set temperature capability
   */
  _setTemperature(value) {
    // Temperature is sent as value × 10
    let temp = value;
    if (Math.abs(value) > 100) {
      temp = value / 10;
    }
    this.log(`[CLIMATE-SENSOR] 🌡️ Temperature: ${temp}°C`);

    if (this.hasCapability('measure_temperature')) {
      this.setCapabilityValue('measure_temperature', temp).catch(this.error);
    }
  }

  /**
   * Set humidity capability
   */
  _setHumidity(value) {
    const humidity = Math.min(100, Math.max(0, value));
    this.log(`[CLIMATE-SENSOR] 💧 Humidity: ${humidity}%`);

    if (this.hasCapability('measure_humidity')) {
      this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
    }
  }

  /**
   * Set battery capability
   */
  _setBattery(value) {
    const battery = Math.min(100, Math.max(0, value));
    this.log(`[CLIMATE-SENSOR] 🔋 Battery: ${battery}%`);

    if (this.hasCapability('measure_battery')) {
      this.setCapabilityValue('measure_battery', battery).catch(this.error);
    }

    // Forward to BatteryManager if available
    if (this.batteryManager && typeof this.batteryManager.onTuyaDPBattery === 'function') {
      this.batteryManager.onTuyaDPBattery({ dpId: 4, value: battery });
    }
  }

  /**
   * Request initial DP values
   */
  _requestInitialDPs() {
    setTimeout(() => {
      this.log('[CLIMATE-SENSOR] 📤 Requesting initial DP values...');

      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDPs === 'function') {
        // Request all known DPs for climate sensor
        this.tuyaEF00Manager.requestDPs([1, 2, 4, 9, 17, 18, 19, 20]);
      }
    }, 5000);
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      fingerprint: this._fingerprint,
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
    this.log('[CLIMATE-SENSOR] Device deleted');
    await super.onDeleted().catch(() => { });
  }
}

module.exports = ClimateSensorDevice;

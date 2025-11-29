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

    // Get manufacturer name
    const mfr = this.getSetting('zb_manufacturerName') || '_TZE284_vvmbj46n';
    this.log(`[CLIMATE-SENSOR] Manufacturer: ${mfr}`);

    // Get fingerprint from enriched database
    this._fingerprint = DeviceFingerprintDB.getFingerprint(mfr);
    if (this._fingerprint) {
      this.log(`[CLIMATE-SENSOR] 📋 Using fingerprint: ${this._fingerprint.productNames?.join(', ') || 'Climate Sensor'}`);
    }

    // Store DP values for debugging
    this._dpValues = {};
    this._dpLastUpdate = null;

    // Setup Tuya DP listener
    await this._setupTuyaDPListener();

    // Request initial data
    this._requestInitialDPs();

    this.log('[CLIMATE-SENSOR] ✅ Initialized');
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

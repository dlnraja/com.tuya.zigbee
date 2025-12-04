'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * TuyaComprehensiveAirMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaComprehensiveAirMonitorDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    this.log('TuyaComprehensiveAirMonitorDevice initializing...');

    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // v5.2.71: Setup Tuya DP for air quality monitors
    await this._setupTuyaDP();

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();
    await this.setupHumiditySensor();

    this.log('TuyaComprehensiveAirMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  /**
   * v5.2.71: Setup Tuya DP handler for air quality monitors
   * Common DPs: 18=PM2.5, 19=CO2, 20=TVOC, 21=formaldehyde
   */
  async _setupTuyaDP() {
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleAirQualityDP(dpId, value);
      });
      this.log('[AIR-QUALITY] ✅ Tuya DP listener configured');
    }
  }

  _handleAirQualityDP(dpId, value) {
    this.log(`[AIR-QUALITY] 📊 DP${dpId} = ${value}`);

    switch (dpId) {
      case 2: // CO2 (ppm)
      case 19: // CO2 alt
        if (this.hasCapability('measure_co2')) {
          this.setCapabilityValue('measure_co2', value).catch(this.error);
          this.log(`[AIR-QUALITY] 🌬️ CO2: ${value} ppm`);
        }
        break;

      case 18: // PM2.5 (µg/m³)
      case 20: // PM2.5 alt
        if (this.hasCapability('measure_pm25')) {
          this.setCapabilityValue('measure_pm25', value).catch(this.error);
          this.log(`[AIR-QUALITY] 🌫️ PM2.5: ${value} µg/m³`);
        }
        break;

      case 1: // Temperature (value / 10)
      case 18: // Temperature alt
        if (this.hasCapability('measure_temperature') && value > -500 && value < 1000) {
          const temp = value > 100 || value < -40 ? value / 10 : value;
          this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          this.log(`[AIR-QUALITY] 🌡️ Temperature: ${temp}°C`);
        }
        break;

      case 2: // Humidity
      case 19: // Humidity alt
        if (this.hasCapability('measure_humidity') && value >= 0 && value <= 100) {
          this.setCapabilityValue('measure_humidity', value).catch(this.error);
          this.log(`[AIR-QUALITY] 💧 Humidity: ${value}%`);
        }
        break;

      case 21: // TVOC (ppb or index)
        this.log(`[AIR-QUALITY] 🧪 TVOC: ${value}`);
        // Store for potential future custom capability
        this.setStoreValue('tvoc_value', value).catch(() => { });
        break;

      case 4:  // Battery
      case 14:
      case 15:
        if (this.hasCapability('measure_battery')) {
          const battery = Math.min(100, Math.max(0, value));
          this.setCapabilityValue('measure_battery', battery).catch(this.error);
          this.log(`[AIR-QUALITY] 🔋 Battery: ${battery}%`);
        }
        break;

      default:
        this.log(`[AIR-QUALITY] ❓ Unknown DP${dpId} = ${value}`);
    }
  }


  /**
   * Setup measure_temperature capability (SDK3)
   * Cluster 1026 - measuredValue
   */
  async setupTemperatureSensor() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }

    this.log('[TEMP]  Setting up measure_temperature (cluster 1026)...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1026]) {
      this.log('[WARN]  Cluster 1026 not available');
      return;
    }

    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_temperature', 1026,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_temperature', Cluster: 1026
*/
      // this.registerCapability('measure_temperature', 1026, {
      //         get: 'measuredValue',
      //         report: 'measuredValue',
      //         reportParser: value => value / 100,
      //         reportOpts: {
      //           configureAttributeReporting: {
      //             minInterval: 60,
      //             maxInterval: 3600,
      //             minChange: 10
      //           }
      //         },
      //         getOpts: {
      //           getOnStart: true
      //         }
      //       });

      this.log('[OK] measure_temperature configured (cluster 1026)');
    } catch (err) {
      this.error('measure_temperature setup failed:', err);
    }
  }

  /**
   * Setup measure_humidity capability (SDK3)
   * Cluster 1029 - measuredValue
   */
  async setupHumiditySensor() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }

    this.log('[TEMP]  Setting up measure_humidity (cluster 1029)...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1029]) {
      this.log('[WARN]  Cluster 1029 not available');
      return;
    }

    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_humidity', 1029,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_humidity', Cluster: 1029
*/
      // this.registerCapability('measure_humidity', 1029, {
      //         get: 'measuredValue',
      //         report: 'measuredValue',
      //         reportParser: value => value / 100,
      //         reportOpts: {
      //           configureAttributeReporting: {
      //             minInterval: 60,
      //             maxInterval: 3600,
      //             minChange: 100
      //           }
      //         },
      //         getOpts: {
      //           getOnStart: true
      //         }
      //       });

      this.log('[OK] measure_humidity configured (cluster 1029)');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('TuyaComprehensiveAirMonitorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaComprehensiveAirMonitorDevice;

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Switch with Temperature Sensor - v5.5.402 (Rolp forum fix)
 *
 * Device: _TZ3218_7fiyo3kv / TS000F
 * Features: Switch + Temperature + Humidity sensor
 *
 * CRITICAL: This device uses cluster 0xE002 (57346) for temp/humidity,
 * NOT the standard Tuya 0xEF00 cluster!
 *
 * Cluster 57346 attributes:
 * - 0x0000: Temperature (int16, div 100)
 * - 0x0001: Humidity (uint16, div 100)
 */

// Tuya DP IDs (fallback if cluster 57346 uses DP format)
const DP_TEMPERATURE = 102; // 0x66
const DP_HUMIDITY = 103;    // 0x67
const DP_CHILD_LOCK = 111;  // 0x6f

// Cluster IDs
const CLUSTER_TUYA_EF00 = 61184;  // 0xEF00 - Standard Tuya
const CLUSTER_TUYA_E002 = 57346;  // 0xE002 - Temperature/Humidity
const CLUSTER_TEMP = 1026;        // 0x0402 - ZCL Temperature
const CLUSTER_HUMIDITY = 1029;    // 0x0405 - ZCL Humidity

class SwitchTempSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════════════');
    this.log('Switch with Temperature Sensor v5.5.402 (Rolp forum fix)');
    this.log('═══════════════════════════════════════════════════════════');
    this.log('ManufacturerName:', this.getSetting('zb_manufacturer_name'));
    this.log('ModelId:', this.getSetting('zb_model_id'));

    // Store zclNode reference
    this.zclNode = zclNode;

    // Log available clusters for debugging
    this._logAvailableClusters(zclNode);

    // Register OnOff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
      this.log('✅ OnOff capability registered');
    }

    // Try ALL methods to get temperature/humidity data
    await this._setupTemperatureListeners(zclNode);

    this.log('✅ Initialization complete');
  }

  /**
   * Log all available clusters for debugging
   */
  _logAvailableClusters(zclNode) {
    try {
      const ep1 = zclNode.endpoints[1];
      if (ep1?.clusters) {
        const clusterIds = Object.keys(ep1.clusters);
        this.log('Available clusters on endpoint 1:', clusterIds.join(', '));
      }
    } catch (e) {
      this.log('Could not enumerate clusters:', e.message);
    }
  }

  /**
   * Setup ALL possible temperature/humidity listeners
   */
  async _setupTemperatureListeners(zclNode) {
    const ep1 = zclNode.endpoints[1];

    // METHOD 1: Cluster 57346 (0xE002) - Tuya temp/humidity cluster
    await this._setupCluster57346(ep1);

    // METHOD 2: Standard Tuya EF00 cluster
    await this._setupTuyaEF00(ep1);

    // METHOD 3: Standard ZCL temperature/humidity clusters
    await this._setupZCLClusters(ep1);

    // METHOD 4: Attribute reporting (configure if supported)
    await this._configureReporting(ep1);
  }

  /**
   * METHOD 1: Cluster 57346 (0xE002) for _TZ3218_7fiyo3kv
   */
  async _setupCluster57346(ep1) {
    try {
      const cluster = ep1?.clusters?.[CLUSTER_TUYA_E002] ||
        ep1?.clusters?.['57346'] ||
        ep1?.clusters?.[String(CLUSTER_TUYA_E002)];

      if (cluster) {
        this.log('✅ Found cluster 57346 (0xE002) - Tuya Temp/Humidity');

        // Listen for attribute reports
        cluster.on('attr', (attr, value) => {
          this.log(`[57346] Attribute ${attr}: ${value}`);
          this._handleCluster57346Attr(attr, value);
        });

        // Try to read initial values
        try {
          const tempAttr = await cluster.readAttributes(['measuredValue']).catch(() => null);
          if (tempAttr?.measuredValue !== undefined) {
            const temp = tempAttr.measuredValue / 100;
            this.log(`[57346] Initial temperature: ${temp}°C`);
            await this._setTemperature(temp);
          }
        } catch (e) {
          this.log('[57346] Could not read initial attributes:', e.message);
        }

        return true;
      }
    } catch (e) {
      this.log('Cluster 57346 setup error:', e.message);
    }
    return false;
  }

  /**
   * Handle cluster 57346 attributes
   */
  _handleCluster57346Attr(attr, value) {
    // Attribute 0 = temperature, Attribute 1 = humidity
    if (attr === 0 || attr === 'measuredValue' || attr === 'temperature') {
      const temp = typeof value === 'number' ? value / 100 : value;
      this._setTemperature(temp);
    } else if (attr === 1 || attr === 'humidity') {
      const hum = typeof value === 'number' ? value / 100 : value;
      this._setHumidity(hum);
    }
  }

  /**
   * METHOD 2: Standard Tuya EF00 cluster
   */
  async _setupTuyaEF00(ep1) {
    try {
      const cluster = ep1?.clusters?.tuya ||
        ep1?.clusters?.[CLUSTER_TUYA_EF00] ||
        ep1?.clusters?.['61184'];

      if (cluster) {
        this.log('✅ Found Tuya EF00 cluster');

        cluster.on('response', this._handleTuyaResponse.bind(this));
        cluster.on('reporting', this._handleTuyaResponse.bind(this));
        cluster.on('datapoint', this._handleTuyaDatapoint.bind(this));

        return true;
      }
    } catch (e) {
      this.log('Tuya EF00 setup error:', e.message);
    }
    return false;
  }

  /**
   * METHOD 3: Standard ZCL clusters
   */
  async _setupZCLClusters(ep1) {
    // Temperature Measurement cluster (0x0402)
    try {
      const tempCluster = ep1?.clusters?.temperatureMeasurement ||
        ep1?.clusters?.[CLUSTER_TEMP];
      if (tempCluster) {
        this.log('✅ Found ZCL Temperature cluster');
        tempCluster.on('attr', (attr, value) => {
          if (attr === 'measuredValue') {
            this._setTemperature(value / 100);
          }
        });
      }
    } catch (e) { /* ignore */ }

    // Relative Humidity cluster (0x0405)
    try {
      const humCluster = ep1?.clusters?.relativeHumidity ||
        ep1?.clusters?.[CLUSTER_HUMIDITY];
      if (humCluster) {
        this.log('✅ Found ZCL Humidity cluster');
        humCluster.on('attr', (attr, value) => {
          if (attr === 'measuredValue') {
            this._setHumidity(value / 100);
          }
        });
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * METHOD 4: Configure attribute reporting
   */
  async _configureReporting(ep1) {
    // Try to configure reporting on cluster 57346
    try {
      const cluster = ep1?.clusters?.[CLUSTER_TUYA_E002];
      if (cluster?.configureReporting) {
        await cluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 10 // 0.1°C
          }
        }).catch(() => { });
        this.log('✅ Configured reporting on cluster 57346');
      }
    } catch (e) { /* ignore */ }
  }

  _handleTuyaResponse(data) {
    this.log('Tuya response:', JSON.stringify(data));
    if (data && data.dp !== undefined) {
      this._handleTuyaDatapoint(data);
    }
  }

  _handleTuyaDatapoint(data) {
    const { dp, value } = data;
    this.log(`Tuya DP ${dp}: ${value}`);

    switch (dp) {
      case DP_TEMPERATURE:
        // Temperature is usually in 0.1°C units
        const temp = typeof value === 'number' ? value / 10 : value;
        this._setTemperature(temp);
        break;

      case DP_HUMIDITY:
        // Humidity is usually in % units
        const hum = typeof value === 'number' ? value : parseInt(value);
        this._setHumidity(hum);
        break;

      default:
        this.log(`Unknown DP ${dp}: ${value}`);
    }
  }

  /**
   * Set temperature with sanity check
   */
  async _setTemperature(temp) {
    if (typeof temp !== 'number' || isNaN(temp)) return;

    // Sanity check: -40°C to +80°C
    if (temp < -40 || temp > 80) {
      this.log(`⚠️ Temperature out of range: ${temp}°C`);
      return;
    }

    const rounded = Math.round(temp * 10) / 10;
    this.log(`🌡️ Temperature: ${rounded}°C`);

    if (this.hasCapability('measure_temperature')) {
      await this.setCapabilityValue('measure_temperature', parseFloat(rounded)).catch(this.error);
    }
  }

  /**
   * Set humidity with sanity check
   */
  async _setHumidity(hum) {
    if (typeof hum !== 'number' || isNaN(hum)) return;

    // Sanity check: 0-100%
    if (hum < 0 || hum > 100) {
      this.log(`⚠️ Humidity out of range: ${hum}%`);
      return;
    }

    const rounded = Math.round(hum);
    this.log(`💧 Humidity: ${rounded}%`);

    if (this.hasCapability('measure_humidity')) {
      await this.setCapabilityValue('measure_humidity', parseFloat(rounded)).catch(this.error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
  }

}

module.exports = SwitchTempSensorDevice;

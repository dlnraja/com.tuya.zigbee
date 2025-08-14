/**
 * 🔧 Tuya Temperature & Humidity Sensor Device
 * TS0201 - Temperature and Humidity Sensor
 */

const { ZigbeeDevice } = require('homey-meshdriver');
const { debounce } = require('../../../../_common');

class TuyaTempHumSensor extends ZigbeeDevice {
  async onMeshInit() {
    // Enable debug logging
    this.enableDebug();
    this.printNode();

    // Register capabilities
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: (value) => {
        // Convert from 0.01°C to °C
        return Math.round(value / 100) / 10;
      }
    });

    this.registerCapability('measure_humidity', 'msRelativeHumidity', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: (value) => {
        // Convert from 0.01% to %
        return Math.round(value / 100) / 10;
      }
    });

    // Battery monitoring
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: (value) => {
          return value / 2; // Convert from 0.5% to %
        }
      });
    }

    // Tuya specific clusters
    this.registerTuyaCluster('manuSpecificTuya');
    
    // Set up polling for sensor data
    this.setPollInterval(300000); // 5 minutes
  }

  /**
   * Register Tuya cluster for DP handling
   */
  registerTuyaCluster(clusterName) {
    try {
      const cluster = this.getClusterEndpoint(clusterName);
      if (cluster) {
        cluster.on('attr.manufacturerCode', (value) => {
          this.log('Tuya manufacturer code:', value);
        });
      }
    } catch (error) {
      this.error('Failed to register Tuya cluster:', error);
    }
  }

  /**
   * Set polling interval for sensor data
   */
  setPollInterval(interval) {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    this.pollInterval = setInterval(async () => {
      try {
        await this.refreshCapabilityValue('measure_temperature');
        await this.refreshCapabilityValue('measure_humidity');
        if (this.hasCapability('measure_battery')) {
          await this.refreshCapabilityValue('measure_battery');
        }
      } catch (error) {
        this.error('Polling error:', error);
      }
    }, interval);
  }

  /**
   * Refresh capability value
   */
  async refreshCapabilityValue(capability) {
    try {
      const value = await this.getCapabilityValue(capability);
      this.log(`Refreshed ${capability}:`, value);
    } catch (error) {
      this.error(`Failed to refresh ${capability}:`, error);
    }
  }

  /**
   * Cleanup on device removal
   */
  async onDeleted() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.log('Tuya Temp & Humidity Sensor removed');
  }
}

module.exports = TuyaTempHumSensor;

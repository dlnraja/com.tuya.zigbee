/**
 * Zigbee Sensor Driver Example
 * Example implementation of a Zigbee sensor driver
 */

const { ZigbeeDriver } = require('homey-meshdriver');

class ZigbeeSensorExample extends ZigbeeDriver {
  
  async onMeshInit() {
    // Register capabilities
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    
    // Register event listeners
    this.registerReportListener('msTemperatureMeasurement', 'attr', (report) => {
      this.log('Temperature report received:', report);
      
      if (report.measuredValue !== undefined) {
        const temperature = report.measuredValue / 100; // Convert to Celsius
        this.setCapabilityValue('measure_temperature', temperature);
      }
    });
    
    this.registerReportListener('msRelativeHumidity', 'attr', (report) => {
      this.log('Humidity report received:', report);
      
      if (report.measuredValue !== undefined) {
        const humidity = report.measuredValue / 100; // Convert to percentage
        this.setCapabilityValue('measure_humidity', humidity);
      }
    });
  }
  
  async onSettings(oldSettings, newSettings, changedKeys) {
    this.log('Settings updated:', changedKeys);
    
    // Handle setting changes
    if (changedKeys.includes('reportingInterval')) {
      this.updateReportingInterval(newSettings.reportingInterval);
    }
  }
  
  async onDeleted() {
    this.log('Device deleted, cleaning up...');
    
    // Cleanup resources
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
  }
  
  updateReportingInterval(interval) {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    
    if (interval > 0) {
      this.reportingTimer = setInterval(() => {
        this.requestReport();
      }, interval * 1000);
    }
  }
  
  async requestReport() {
    try {
      // Request temperature report
      await this.node.endpoints[1].clusters.msTemperatureMeasurement.read('measuredValue');
      
      // Request humidity report
      await this.node.endpoints[1].clusters.msRelativeHumidity.read('measuredValue');
    } catch (error) {
      this.log('Error requesting report:', error);
    }
  }
}

module.exports = ZigbeeSensorExample;

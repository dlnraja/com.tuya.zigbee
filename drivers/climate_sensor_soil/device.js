'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TuyaSoilTesterTempHumidDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSoilTesterTempHumidDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TuyaSoilTesterTempHumidDevice initializing...');
    
    // Setup sensor reporting
    await this.setupSensorReporting();
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('TuyaSoilTesterTempHumidDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async setupSensorReporting() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      
      if (endpoint?.clusters?.msTemperatureMeasurement) {
        endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
          await this.setCapabilityValue('measure_temperature', value / 100).catch(this.error);
        });
      }
      
      if (endpoint?.clusters?.msRelativeHumidity) {
        endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
          await this.setCapabilityValue('measure_humidity', value / 100).catch(this.error);
        });
      }
      
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          await this.setCapabilityValue('measure_battery', value / 2).catch(this.error);
        });
      }
      
      await this.configureAttributeReporting([
        { endpointId: 1, cluster: 1026, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1029, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
      ]).catch(err => this.log('Reporting config (non-critical):', err.message));
      
    } catch (err) {
      this.error('Sensor reporting setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('TuyaSoilTesterTempHumidDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaSoilTesterTempHumidDevice;

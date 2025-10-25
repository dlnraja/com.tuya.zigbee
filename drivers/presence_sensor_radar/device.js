'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * PresenceSensorRadarDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PresenceSensorRadarDevice extends BaseHybridDevice {

  async onNodeInit() {
    // Critical: Attribute reporting for data transmission
    await this.setupAttributeReporting();

    this.log('PresenceSensorRadarDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));

    // Setup sensor capabilities (SDK3)
    await this.setupLuminanceSensor();
    
    this.log('PresenceSensorRadarDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  
  /**
   * Setup measure_luminance capability (SDK3)
   * Cluster 1024 - measuredValue
   */
  async setupLuminanceSensor() {
    if (!this.hasCapability('measure_luminance')) {
      return;
    }
    
    this.log('🌡️  Setting up measure_luminance (cluster 1024)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1024]) {
      this.log('⚠️  Cluster 1024 not available');
      return;
    }
    
    try {
      this.registerCapability('measure_luminance', 1024, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => Math.pow(10, (value - 1) / 10000),
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('✅ measure_luminance configured (cluster 1024)');
    } catch (err) {
      this.error('measure_luminance setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('PresenceSensorRadarDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
  /**
   * Setup Attribute Reporting for Presence Sensor
   * Temperature, Humidity, Battery, Illuminance, Motion
   */
  async setupAttributeReporting() {
    try {
      this.log('📊 Setting up attribute reporting...');
      
      const endpoint = this.zclNode.endpoints[1];
      
      // Setup cluster listeners FIRST (before configureAttributeReporting)
      
      // Temperature listener (cluster 1026)
      if (endpoint?.clusters?.msTemperatureMeasurement) {
        endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
          const temperature = value / 100;
          this.log('🌡️ Temperature:', temperature);
          await this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
        });
      }
      
      // Humidity listener (cluster 1029)
      if (endpoint?.clusters?.msRelativeHumidity) {
        endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
          const humidity = value / 100;
          this.log('💧 Humidity:', humidity);
          await this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
        });
      }
      
      // Battery listener (cluster 1)
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = value / 2;
          this.log('🔋 Battery:', battery, '%');
          await this.setCapabilityValue('measure_battery', battery).catch(this.error);
        });
      }
      
      // Illuminance listener (cluster 1024)
      if (endpoint?.clusters?.msIlluminanceMeasurement) {
        endpoint.clusters.msIlluminanceMeasurement.on('attr.measuredValue', async (value) => {
          const lux = Math.pow(10, (value - 1) / 10000);
          this.log('💡 Illuminance:', lux, 'lux');
          await this.setCapabilityValue('measure_luminance', lux).catch(this.error);
        });
      }
      
      // Motion detection via IAS Zone (cluster 1280)
      if (endpoint?.clusters?.ssIasZone) {
        // Enroll IAS Zone first
        const ieeeAddress = await this.homey.zigbee.getIeeeAddress();
        await endpoint.clusters.ssIasZone.writeAttributes({
          iasCieAddr: ieeeAddress
        }).catch(err => this.log('IAS enrollment (non-critical):', err.message));
        
        // Zone notifications (motion detection)
        endpoint.clusters.ssIasZone.on('zoneStatusChangeNotification', async (data) => {
          this.log('🚶 Motion detected:', data);
          const motion = !!(data.zoneStatus & 1);
          await this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        });
        
        // Attribute listener (backup)
        endpoint.clusters.ssIasZone.on('attr.zoneStatus', async (value) => {
          this.log('🚶 Motion status:', value);
          const motion = !!(value & 1);
          await this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        });
      }
      
      // Configure reporting intervals (numbers only)
      await this.configureAttributeReporting([
        { endpointId: 1, cluster: 1026, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1029, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 },
        { endpointId: 1, cluster: 1024, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 100 }
      ]).catch(err => this.log('Configure reporting (non-critical):', err.message));
      
      this.log('✅ Attribute reporting configured');
      
    } catch (err) {
      this.error('Attribute reporting setup failed:', err);
    }
  }

}

module.exports = PresenceSensorRadarDevice;

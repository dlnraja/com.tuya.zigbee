'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TempHumidSensorAdvancedDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TempHumidSensorAdvancedDevice extends BaseHybridDevice {

  async onNodeInit() {
    // Setup time synchronization for Tuya device
    await this.setupTimeSync();

    // === AUTO-IMPLEMENTED SENSOR REPORTING ===
    await this.setupSensorReporting();

    this.log('TempHumidSensorAdvancedDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('TempHumidSensorAdvancedDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TempHumidSensorAdvancedDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
  async setupSensorReporting() {
    try {

      // Temperature reporting
      this.registerAttrReportListener(
        'msTemperatureMeasurement',
        'measuredValue',
        1,
        300,
        1,
        value => {
          const temperature = value / 100;
          this.log('Temperature:', temperature, '°C');
          this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
        },
        1
      ).catch(err => this.error('Temperature reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'msTemperatureMeasurement',
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 3600,
        minChange: 50
      }]).catch(this.error);

      // Humidity reporting
      this.registerAttrReportListener(
        'msRelativeHumidity',
        'measuredValue',
        1,
        300,
        1,
        value => {
          const humidity = value / 100;
          this.log('Humidity:', humidity, '%');
          this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
        },
        1
      ).catch(err => this.error('Humidity reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'msRelativeHumidity',
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 3600,
        minChange: 100
      }]).catch(this.error);

      // Battery reporting
      this.registerAttrReportListener(
        'genPowerCfg',
        'batteryPercentageRemaining',
        1,
        3600,
        1,
        value => {
          const battery = Math.round(value / 2);
          this.log('Battery:', battery, '%');
          this.setCapabilityValue('measure_battery', battery).catch(this.error);
        },
        1
      ).catch(err => this.error('Battery reporting failed:', err));
      
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'genPowerCfg',
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 43200,
        minChange: 2
      }]).catch(this.error);

      // Motion IAS Zone reporting
      this.registerAttrReportListener(
        'iasZone',
        'zoneStatus',
        1,
        0,
        1,
        value => {
          const motion = !!(value & 0x01);
          this.log('Motion:', motion);
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        },
        1
      ).catch(err => this.error('Motion reporting failed:', err));
      
      // Zone status notification listener
      if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
        this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
          const motion = !!(data.zoneStatus & 0x01);
          this.log('Motion notification:', motion);
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        });
      }

      // Contact IAS Zone reporting
      this.registerAttrReportListener(
        'iasZone',
        'zoneStatus',
        1,
        0,
        1,
        value => {
          const contact = !(value & 0x01);
          this.log('Contact:', contact);
          this.setCapabilityValue('alarm_contact', contact).catch(this.error);
        },
        1
      ).catch(err => this.error('Contact reporting failed:', err));
      
      // Zone status notification listener
      if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
        this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
          const contact = !(data.zoneStatus & 0x01);
          this.log('Contact notification:', contact);
          this.setCapabilityValue('alarm_contact', contact).catch(this.error);
        });
      }

    } catch (err) {
      this.error('Failed to configure sensor reporting:', err);
    }
  }

  /**
   * Setup Time Synchronization
   * Required for Tuya devices to function properly
   */
  async setupTimeSync() {
    try {
      // Time cluster synchronization
      if (this.zclNode.endpoints[1]?.clusters?.time) {
        this.log('Setting up time synchronization...');
        
        // Calculate Zigbee epoch time (seconds since 2000-01-01 00:00:00 UTC)
        const zigbeeEpochStart = new Date('2000-01-01T00:00:00Z').getTime();
        const currentTime = Date.now();
        const zigbeeTime = Math.floor((currentTime - zigbeeEpochStart) / 1000);
        
        // Write time to device
        await this.zclNode.endpoints[1].clusters.time.writeAttributes({
          time: zigbeeTime,
          timeStatus: {
            master: true,
            synchronized: true,
            masterZoneDst: false,
            superseding: false
          }
        }).catch(err => this.log('Time sync write failed (non-critical):', err.message));
        
        // Setup periodic time sync (every 24 hours)
        this.timeSyncInterval = setInterval(async () => {
          const newZigbeeTime = Math.floor((Date.now() - zigbeeEpochStart) / 1000);
          await this.zclNode.endpoints[1].clusters.time.writeAttributes({
            time: newZigbeeTime
          }).catch(err => this.log('Time resync failed:', err.message));
          this.log('Time resynchronized');
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        this.log('Time synchronization configured');
      }
    } catch (err) {
      this.error('Time sync setup failed (non-critical):', err);
    }
  }
  
  /**
   * Cleanup time sync interval on device removal
   */
  async onDeleted() {
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
    }
    await super.onDeleted?.();
  }

}

module.exports = TempHumidSensorAdvancedDevice;

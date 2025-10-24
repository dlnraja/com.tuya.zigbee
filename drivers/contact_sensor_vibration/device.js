'use strict';

const SensorDevice = require('../../lib/SensorDevice');
const { Cluster, CLUSTER } = require('zigbee-clusters');

/**
 * Contact & Vibration Sensor (HOBEIAN ZG-102ZM)
 * 
 * Capabilities:
 * - alarm_contact: Door/Window contact status
 * - alarm_tamper: Vibration/Shock detection  
 * - measure_battery: Battery percentage
 * - alarm_battery: Low battery alarm
 */
class ContactVibrationSensor extends SensorDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit();

    this.printNode();
    
    // Enable debug
    this.enableDebug();
    this.printDebug('Contact & Vibration Sensor initialized');

    // Register capabilities
    await this.registerCapabilities(zclNode);
    
    // Configure reporting
    await this.configureReporting(zclNode);
  }

  async registerCapabilities(zclNode) {
    // IAS Zone - Contact & Vibration
    if (this.hasCapability('alarm_contact') || this.hasCapability('alarm_tamper')) {
      zclNode.endpoints[1].clusters.iasZone
        .on('zoneStatusChangeNotification', payload => {
          this.printDebug('IAS Zone Status:', payload);
          
          // Bit 0: Alarm 1 (Contact)
          const contactAlarm = (payload.zoneStatus & 0x01) === 0x01;
          if (this.hasCapability('alarm_contact')) {
            this.setCapabilityValue('alarm_contact', contactAlarm).catch(this.error);
          }
          
          // Bit 1: Alarm 2 (Tamper/Vibration)
          const tamperAlarm = (payload.zoneStatus & 0x02) === 0x02;
          if (this.hasCapability('alarm_tamper')) {
            this.setCapabilityValue('alarm_tamper', tamperAlarm).catch(this.error);
          }
          
          // Bit 3: Battery low
          const batteryLow = (payload.zoneStatus & 0x08) === 0x08;
          if (this.hasCapability('alarm_battery')) {
            this.setCapabilityValue('alarm_battery', batteryLow).catch(this.error);
          }
        });
    }

    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        reportParser: value => {
          const batteryThreshold = this.getSetting('battery_low_threshold') || 20;
          const percentage = value / 2;
          
          if (this.hasCapability('alarm_battery')) {
            this.setCapabilityValue('alarm_battery', percentage < batteryThreshold).catch(this.error);
          }
          
          return percentage;
        },
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
      });
    }
  }

  async configureReporting(zclNode) {
    try {
      // Configure IAS Zone reporting
      await zclNode.endpoints[1].clusters.iasZone.configureReporting({
        zoneStatus: {
          minInterval: 0,
          maxInterval: 300,
          minChange: 1,
        },
      }).catch(err => {
        this.printDebug('Failed to configure IAS Zone reporting:', err);
      });

      // Configure Battery reporting
      await zclNode.endpoints[1].clusters.powerConfiguration.configureReporting({
        batteryPercentageRemaining: {
          minInterval: 3600,
          maxInterval: 86400,
          minChange: 2,
        },
      }).catch(err => {
        this.printDebug('Failed to configure battery reporting:', err);
      });

    } catch (err) {
      this.error('Error configuring reporting:', err);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.printDebug('Settings changed:', changedKeys);

    // Handle sensitivity change
    if (changedKeys.includes('sensitivity')) {
      try {
        const sensitivity = newSettings.sensitivity;
        this.printDebug('Setting sensitivity to:', sensitivity);
        
        // Write sensitivity attribute (manufacturer specific)
        // Note: This may require manufacturer-specific cluster
        // Adjust cluster/attribute based on device behavior
        await this.zclNode.endpoints[1].clusters.basic.writeAttributes({
          0x0500: sensitivity, // Manufacturer specific attribute
        }).catch(err => {
          this.printDebug('Failed to set sensitivity (normal for some devices):', err);
        });
        
      } catch (err) {
        this.error('Error setting sensitivity:', err);
        throw new Error(this.homey.__('settings.sensitivity_failed'));
      }
    }

    // Handle battery threshold change
    if (changedKeys.includes('battery_low_threshold')) {
      const currentBattery = this.getCapabilityValue('measure_battery');
      const threshold = newSettings.battery_low_threshold;
      
      if (currentBattery !== null && this.hasCapability('alarm_battery')) {
        this.setCapabilityValue('alarm_battery', currentBattery < threshold).catch(this.error);
      }
    }
  }

  printDebug(...args) {
    if (this.isDebug) {
      this.log('[ContactVibrationSensor]', ...args);
    }
  }

  enableDebug() {
    this.isDebug = true;
  }

  disableDebug() {
    this.isDebug = false;
  }

}

module.exports = ContactVibrationSensor;

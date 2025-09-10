#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaDoorWindowSensor extends ZigBeeDevice {
  
  state = {
    contact: null,
    battery: null,
    batteryLow: false,
    tamper: false,
    lastUpdate: null,
    batteryThreshold: 20, // Battery low threshold in %
    reportInterval: 3600, // Default report interval in seconds
    contactState: 'unknown', // 'open', 'closed', 'unknown'
  };

  async onNodeInit({ zclNode }) {
    this.log('Tuya Door/Window Sensor has been initialized');
    
    // Register contact capability
    await this.registerContactCapability(zclNode);
    
    // Register tamper alarm capability
    await this.registerTamperCapability(zclNode);
    
    // Register battery capability
    await this.registerBatteryCapability(zclNode);
    
    // Enable debugging
    this.enableDebug();
    this.printNode();
  }

  /**
   * Register contact capability and set up reporting
   */
  async registerContactCapability(zclNode) {
    // Add contact capability if not already present
    if (this.hasCapability('alarm_contact') === false) {
      await this.addCapability('alarm_contact').catch(this.error);
    }

    // Configure contact state reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]) {
      this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        getOpts: {
          getOnStart: true,
        },
        report: 'zoneStatusChangeNotification',
        reportParser: value => {
          // Bit 0 indicates if the device is open (1) or closed (0)
          const isOpen = (value.zoneStatus & 1) === 1;
          this.state.contactState = isOpen ? 'open' : 'closed';
          this.state.lastUpdate = Date.now();
          this.log(`Contact state updated: ${this.state.contactState}`);
          return isOpen;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: this.state.reportInterval,
            minChange: 1, // Report any change
          },
        },
      });
    }
  }

  /**
   * Register tamper alarm capability
   */
  async registerTamperCapability(zclNode) {
    // Add tamper alarm capability if not already present
    if (this.hasCapability('alarm_tamper') === false) {
      await this.addCapability('alarm_tamper').catch(this.error);
    }

    // Configure tamper alarm reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]) {
      this.registerCapability('alarm_tamper', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        getOpts: {
          getOnStart: true,
        },
        report: 'zoneStatusChangeNotification',
        reportParser: value => {
          // Bit 3 indicates if the device has been tampered with
          const isTampered = ((value.zoneStatus >> 3) & 1) === 1;
          this.state.tamper = isTampered;
          this.log(`Tamper alarm state updated: ${isTampered ? 'triggered' : 'clear'}`);
          return isTampered;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: this.state.reportInterval,
            minChange: 1, // Report any change
          },
        },
      });
    }
  }

  /**
   * Register battery capability and set up reporting
   */
  async registerBatteryCapability(zclNode) {
    // Add battery capability if not already present
    if (this.hasCapability('measure_battery') === false) {
      await this.addCapability('measure_battery').catch(this.error);
    }
    
    if (this.hasCapability('alarm_battery') === false) {
      await this.addCapability('alarm_battery').catch(this.error);
    }

    // Configure battery voltage reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
        report: 'batteryPercentageRemaining',
        reportParser: value => {
          // Convert from 0-200 to 0-100%
          const batteryPercentage = Math.min(100, value / 2);
          this.updateBatteryStatus(batteryPercentage);
          return batteryPercentage;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: this.state.reportInterval,
            minChange: 5, // Report when battery changes by 5%
          },
        },
      });
    }
  }

  /**
   * Update battery status and trigger low battery alarm if needed
   */
  updateBatteryStatus(batteryPercentage) {
    // Check if battery is low
    const batteryLow = batteryPercentage <= this.state.batteryThreshold;
    
    // Update battery low alarm if state changed
    if (this.state.batteryLow !== batteryLow) {
      this.state.batteryLow = batteryLow;
      this.setCapabilityValue('alarm_battery', batteryLow).catch(this.error);
      
      if (batteryLow) {
        this.log(`Battery low: ${batteryPercentage}%`);
      }
    }
    
    // Update last battery update time
    this.state.lastBatteryUpdate = Date.now();
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    // Handle report interval changes
    if (changedKeys.includes('report_interval')) {
      const interval = parseInt(newSettings.report_interval) || 3600;
      this.state.reportInterval = Math.max(60, interval); // Minimum 60 seconds
      this.log(`Report interval updated to: ${this.state.reportInterval} seconds`);
      
      // TODO: Update report configuration for all clusters
    }
    
    // Handle battery threshold changes
    if (changedKeys.includes('battery_threshold')) {
      const threshold = parseInt(newSettings.battery_threshold) || 20;
      this.state.batteryThreshold = Math.min(50, Math.max(5, threshold)); // Clamp between 5-50%
      this.log(`Battery low threshold updated to: ${this.state.batteryThreshold}%`);
      
      // Re-check battery status with new threshold
      const currentBattery = this.getCapabilityValue('measure_battery');
      this.updateBatteryStatus(currentBattery);
    }
  }

  onDeleted() {
    this.log('Door/Window sensor removed');
  }
}

module.exports = TuyaDoorWindowSensor;

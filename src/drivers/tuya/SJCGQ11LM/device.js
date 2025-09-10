#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaWaterLeakSensor extends ZigBeeDevice {
  
  state = {
    waterLeak: false,
    battery: null,
    batteryLow: false,
    tamper: false,
    lastUpdate: null,
    batteryThreshold: 20, // Battery low threshold in %
    reportInterval: 3600, // Default report interval in seconds
  };

  async onNodeInit({ zclNode }) {
    this.log('Tuya Water Leak Sensor has been initialized');
    
    // Register water leak capability
    await this.registerWaterLeakCapability(zclNode);
    
    // Register tamper alarm capability
    await this.registerTamperCapability(zclNode);
    
    // Register battery capability
    await this.registerBatteryCapability(zclNode);
    
    // Enable debugging
    this.enableDebug();
    this.printNode();
  }

  /**
   * Register water leak capability and set up reporting
   */
  async registerWaterLeakCapability(zclNode) {
    // Add water leak capability if not already present
    if (this.hasCapability('alarm_water') === false) {
      await this.addCapability('alarm_water').catch(this.error);
    }

    // Configure water leak reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]) {
      this.registerCapability('alarm_water', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        getOpts: {
          getOnStart: true,
        },
        report: 'zoneStatusChangeNotification',
        reportParser: value => {
          // Bit 0 indicates water leak (1) or no leak (0)
          const isLeaking = (value.zoneStatus & 1) === 1;
          this.state.waterLeak = isLeaking;
          this.state.lastUpdate = Date.now();
          this.log(`Water leak state updated: ${isLeaking ? 'leak detected' : 'no leak'}`);
          return isLeaking;
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
    this.log('Water leak sensor removed');
  }
}

module.exports = TuyaWaterLeakSensor;

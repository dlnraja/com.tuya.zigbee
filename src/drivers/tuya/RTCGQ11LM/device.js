#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaMotionSensorDevice extends ZigBeeDevice {
  
  // Motion sensor state
  state = {
    battery: null,
    batteryLow: false,
    occupancy: false,
    lastMotion: null,
    occupancyTimeout: null,
    batteryThreshold: 20, // Battery low threshold in %
  };

  async onNodeInit({ zclNode }) {
    this.log('Tuya Motion Sensor has been initialized');

    // Register battery capability
    await this.registerBatteryCapability(zclNode);
    
    // Register motion detection capability
    await this.registerMotionCapability(zclNode);
    
    // Enable debugging
    this.enableDebug();
    this.printNode();
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
            maxInterval: 3600, // 1 hour
            minChange: 5, // Report when battery changes by 5%
          },
        },
      });
    }
  }

  /**
   * Register motion detection capability
   */
  async registerMotionCapability(zclNode) {
    // Add motion capability if not already present
    if (this.hasCapability('alarm_motion') === false) {
      await this.addCapability('alarm_motion').catch(this.error);
    }

    // Configure occupancy reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]) {
      const occupancyCluster = zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME];
      
      // Configure occupancy reporting
      this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
        get: 'occupancy',
        getOpts: {
          getOnStart: true,
        },
        report: 'occupancy',
        reportParser: value => {
          const occupancy = value === 1;
          this.handleMotionEvent(occupancy);
          return occupancy;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: 0, // Report immediately
            minChange: 1, // Report any change
          },
        },
      });

      // Configure PIR sensitivity if available
      if (this.hasCapability('onoff')) {
        this.registerCapability('onoff', CLUSTER.OCCUPANCY_SENSING, {
          get: 'pirOToUDelay',
          set: 'setPirOToUDelay',
          setParser: value => ({
            delay: value ? 30 : 0, // 30 seconds delay if enabled, 0 if disabled
          }),
          report: 'pirOToUDelay',
          reportParser: value => value > 0,
        });
      }
    }
  }

  /**
   * Handle motion detection events
   */
  handleMotionEvent(detected) {
    if (detected) {
      this.state.lastMotion = new Date();
      this.log('Motion detected at', this.state.lastMotion);
      
      // Clear any existing timeout
      if (this.state.occupancyTimeout) {
        clearTimeout(this.state.occupancyTimeout);
      }
      
      // Set motion to true
      this.state.occupancy = true;
      this.setCapabilityValue('alarm_motion', true).catch(this.error);
      
      // Set timeout to clear motion after 60 seconds
      this.state.occupancyTimeout = setTimeout(() => {
        this.state.occupancy = false;
        this.setCapabilityValue('alarm_motion', false).catch(this.error);
        this.log('Motion cleared after timeout');
      }, 60000);
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
    
    // Handle sensitivity setting changes
    if (changedKeys.includes('sensitivity')) {
      // Update PIR sensitivity if available
      if (this.hasCapability('onoff')) {
        await this.setCapabilityValue('onoff', newSettings.sensitivity === 'high')
          .catch(this.error);
      }
    }
  }

  onDeleted() {
    this.log('Motion sensor removed');
    
    // Clean up any active timeouts
    if (this.state.occupancyTimeout) {
      clearTimeout(this.state.occupancyTimeout);
    }
  }
}

module.exports = TuyaMotionSensorDevice;

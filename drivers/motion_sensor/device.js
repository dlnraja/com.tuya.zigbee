'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Tuya Motion Sensor Device
 * Supports PIR motion detection with battery monitoring
 * Compatible with TS0202, _TZ3000_mmtwjmaq, and similar devices
 */
class TuyaMotionSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    try {
      // Enable debugging for development
      this.enableDebug();
      this.printNode();
      
      this.log('Initializing Tuya Motion Sensor...');

      // Register motion alarm capability with optimized reporting
      if (this.hasCapability('alarm_motion')) {
        await this.registerCapability('alarm_motion', 'msOccupancySensing', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 1,     // Immediate reporting
              maxInterval: 300,   // 5 minutes max
              minChange: 1,       // Any state change
            },
          },
        });
        this.log('Motion detection capability registered');
      }

      // Register battery capability with efficient reporting
      if (this.hasCapability('measure_battery')) {
        await this.registerCapability('measure_battery', 'genPowerCfg', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 3600,  // 1 hour minimum
              maxInterval: 43200, // 12 hours maximum  
              minChange: 5,       // 5% battery change
            },
          },
        });
        this.log('Battery monitoring capability registered');
      }

      // Add motion event listener for flow triggers
      this.registerCapabilityListener('alarm_motion', (value) => {
        this.log('Motion detected:', value);
        if (value) {
          this.homey.flow.getDeviceTriggerCard('motion_alarm').trigger(this);
        }
      });

      this.log('Tuya Motion Sensor successfully initialized');
    } catch (error) {
      this.error('Failed to initialize Tuya Motion Sensor:', error);
      throw error;
    }
  }

  /**
   * Handle device removal cleanup
   */
  async onDeleted() {
    try {
      this.log('Tuya Motion Sensor removed from Homey');
    } catch (error) {
      this.error('Error during device removal:', error);
    }
  }

}

module.exports = TuyaMotionSensorDevice;

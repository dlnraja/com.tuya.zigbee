const BaseZigbeeDevice = require('../../common/BaseZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class RS0201MotionSensor extends BaseZigbeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // Register capabilities
    await this.registerCapabilities();
    
    // Apply user patches from community
    this.applyUserPatches();
    
    this.log('RS0201 Motion Sensor initialized');
  }

  async registerCapabilities() {
    // Motion detection
    this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
      report: 'occupancy',
      reportParser: value => value === 1,
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0, // No minimum reporting interval
          maxInterval: 300, // Report every 5 minutes if no change
          minChange: 1, // Report any change
        }
      }
    });

    // Battery level
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      report: 'batteryPercentageRemaining',
      reportParser: value => value / 2, // Convert to percentage
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0, // No minimum reporting interval
          maxInterval: 3600, // Report every 60 minutes if no change
          minChange: 5, // Report if battery changes by 5%
        }
      }
    });
  }
}

module.exports = RS0201MotionSensor;

'use strict';

const { Driver } = require('homey');

/**
 * v5.5.506: Fixed flow card registration with error handling
 */
class WaterTankMonitorDriver extends Driver {

  async onInit() {
    this.log('Water Tank Monitor driver v5.5.506 initializing...');

    try {
      // Register flow card triggers
      this.waterLevelChangedTrigger = this.homey.flow.getDeviceTriggerCard('water_level_changed');
      this.lowWaterAlarmTrigger = this.homey.flow.getDeviceTriggerCard('water_tank_low');
      this.log('Water Tank Monitor ✅ Flow cards registered');
    } catch (err) {
      this.error('Water Tank Monitor flow card registration failed:', err.message);
    }
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = WaterTankMonitorDriver;

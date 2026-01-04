'use strict';

const { Driver } = require('homey');

class WaterTankMonitorDriver extends Driver {

  async onInit() {
    this.log('Water Tank Monitor driver initialized');

    // Register flow card triggers
    this.waterLevelChangedTrigger = this.homey.flow.getDeviceTriggerCard('water_level_changed');
    this.lowWaterAlarmTrigger = this.homey.flow.getDeviceTriggerCard('water_tank_low');

    this.log('Water Tank Monitor flow cards registered');
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = WaterTankMonitorDriver;

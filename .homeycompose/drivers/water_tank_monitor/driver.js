'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 * v5.5.506: Original - used Driver instead of ZigBeeDriver
 */
class WaterTankMonitorDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.534: SDK3 CRITICAL
    this.log('Water Tank Monitor driver v5.5.534 initializing...');

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

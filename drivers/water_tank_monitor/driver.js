'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.556: Safe flow card registration - no stderr on missing cards
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 * v5.5.506: Original - used Driver instead of ZigBeeDriver
 */
class WaterTankMonitorDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.534: SDK3 CRITICAL
    this.log('Water Tank Monitor driver v5.5.556 initializing...');

    // v5.5.556: Safe flow card registration helper
    const safeGetTrigger = (id) => {
      try {
        return this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.log(`[FLOW] Trigger '${id}' not defined - skipping`);
        return null;
      }
    };

    // Register flow card triggers (graceful if not defined)
    this.waterLevelChangedTrigger = safeGetTrigger('water_level_changed');
    this.lowWaterAlarmTrigger = safeGetTrigger('water_tank_low');
    this.fullWaterTrigger = safeGetTrigger('water_tank_full');
    this.batteryLowTrigger = safeGetTrigger('water_tank_battery_low');
    
    const registered = [this.waterLevelChangedTrigger, this.lowWaterAlarmTrigger, 
                        this.fullWaterTrigger, this.batteryLowTrigger].filter(Boolean).length;
    this.log(`Water Tank Monitor ✅ ${registered}/4 Flow cards registered`);
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = WaterTankMonitorDriver;

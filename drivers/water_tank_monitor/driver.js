'use strict';

const Homey = require('homey');

/**
 * v5.8.20: FIX MODULE_NOT_FOUND ./rgb - Use Homey.Driver instead of ZigBeeDriver
 *          The ZigBeeDriver import triggers color-space dependency issue
 * v5.5.587: Added condition run listener for water_level_above
 * v5.5.556: Safe flow card registration - no stderr on missing cards
 */
class WaterTankMonitorDriver extends Homey.Driver {

  async onInit() {
    this.log('Water Tank Monitor driver v5.5.587 initializing...');

    const safeGetTrigger = (id) => {
      try {
        return this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.log(`[FLOW] Trigger '${id}' not defined - skipping`);
        return null;
      }
    };

    this.waterLevelChangedTrigger = safeGetTrigger('water_tank_monitor_level_changed');
    this.lowWaterAlarmTrigger = safeGetTrigger('water_tank_monitor_low');
    this.fullWaterTrigger = safeGetTrigger('water_tank_monitor_full');
    this.batteryLowTrigger = safeGetTrigger('water_tank_monitor_battery_low');
    
    // v5.5.587: Register condition run listener
    try {
      this.homey.flow.getConditionCard('water_tank_monitor_level_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const level = args.device.getCapabilityValue('measure_water') || 0;
          const threshold = args.level || 20;
          return level > threshold;
        });
      this.log('[FLOW] ✅ water_tank_monitor_level_above condition registered');
    } catch (err) {
      this.log(`[FLOW] ⚠️ water_tank_monitor_level_above: ${err.message}`);
    }

    const registered = [this.waterLevelChangedTrigger, this.lowWaterAlarmTrigger, 
                        this.fullWaterTrigger, this.batteryLowTrigger].filter(Boolean).length;
    this.log(`Water Tank Monitor ✅ ${registered}/4 Flow triggers + 1 condition registered`);
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WaterTankMonitorDriver;

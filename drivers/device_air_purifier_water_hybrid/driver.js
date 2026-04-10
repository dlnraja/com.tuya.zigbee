'use strict';

const Homey = require('homey');

/**
 * Liquid Level Sensor Driver
 * v5.9.12: Rewritten to match Z2M TLC2206 verified DP mapping
 */
class WaterTankMonitorDriver extends Homey.Driver {

  async onInit() {
    this.log('Liquid Level Sensor driver initializing...');

    const safeGetTrigger = (id) => {
      try { return
      this.homey.flow.getTriggerCard(id) ; }
      catch (e) { this.log(`[FLOW] Trigger '${id}' not defined`); return null; }
    };

    this.stateChangedTrigger = safeGetTrigger('water_tank_monitor_state_changed');
    this.levelChangedTrigger = safeGetTrigger('water_tank_monitor_level_changed');
    this.lowLevelTrigger = safeGetTrigger('water_tank_monitor_low');
    this.highLevelTrigger = safeGetTrigger('water_tank_monitor_high');

    // Condition: fill level above threshold
    try {
      this.homey.flow.getConditionCard('water_tank_monitor_level_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const pct = args.device.getCapabilityValue('measure_water_percentage') || 0;
          return pct > (args.level || 20);
        });
    } catch (err) { this.log(`[FLOW] level_above: ${err.message}`); }

    // Condition: liquid state is
    try {
      this.homey.flow.getConditionCard('water_tank_monitor_state_is')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device._lastState === args.state;
        });
    } catch (err) { this.log(`[FLOW] state_is: ${err.message}`); }

    const triggers = [this.stateChangedTrigger, this.levelChangedTrigger,
      this.lowLevelTrigger, this.highLevelTrigger].filter(Boolean).length;
    this.log(`Liquid Level Sensor: ${triggers}/4 triggers + 2 conditions registered`);
  }

  async onPairListDevices() { return []; }
}

module.exports = WaterTankMonitorDriver;


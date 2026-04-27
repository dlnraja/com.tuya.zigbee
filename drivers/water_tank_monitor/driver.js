'use strict';

const Homey = require('homey');

/**
 * Liquid Level Sensor Driver
 * v7.4.11: Fixed corrupted flow card registration
 */
class WaterTankMonitorDriver extends Homey.Driver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Liquid Level Sensor driver initializing...');

    const safeGetTrigger = (id) => {
      try {
        return this.homey.flow.getTriggerCard(id);
      } catch (e) {
        this.log(`[FLOW] Trigger '${id}' not defined`);
        return null;
      }
    };

    this.stateChangedTrigger = safeGetTrigger('water_tank_monitor_state_changed');
    this.levelChangedTrigger = safeGetTrigger('water_tank_monitor_level_changed');
    this.lowLevelTrigger = safeGetTrigger('water_tank_monitor_low');
    this.highLevelTrigger = safeGetTrigger('water_tank_monitor_high');

    // Condition: fill level above threshold
    try {
      const card = this.homey.flow.getConditionCard('water_tank_monitor_level_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const pct = args.device.getCapabilityValue('measure_water_percentage') || 0;
          return pct > (args.level || 20);
        });
      }
    } catch (err) {
      this.log(`[FLOW] level_above: ${err.message}`);
    }

    // Condition: liquid state is
    try {
      const card = this.homey.flow.getConditionCard('water_tank_monitor_state_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device._lastState === args.state;
        });
      }
    } catch (err) {
      this.log(`[FLOW] state_is: ${err.message}`);
    }

    const triggers = [this.stateChangedTrigger, this.levelChangedTrigger,
      this.lowLevelTrigger, this.highLevelTrigger].filter(Boolean).length;
    this.log(`Liquid Level Sensor: ${triggers}/4 triggers + 2 conditions registered`);
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WaterTankMonitorDriver;

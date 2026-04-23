'use strict';

const Homey = require('homey');

class WaterTankMonitorDriver extends Homey {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('Liquid Level Sensor driver initializing...');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('device_air_purifier_water_hybrid_water_tank_monitor_state_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_air_purifier_water_hybrid_water_tank_monitor_level_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_air_purifier_water_hybrid_water_tank_monitor_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_air_purifier_water_hybrid_water_tank_monitor_high'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('device_air_purifier_water_hybrid_water_tank_monitor_level_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition device_air_purifier_water_hybrid_water_tank_monitor_level_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('device_air_purifier_water_hybrid_water_tank_monitor_state_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition device_air_purifier_water_hybrid_water_tank_monitor_state_is: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = WaterTankMonitorDriver;

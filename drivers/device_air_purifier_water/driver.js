'use strict';

const { Driver } = require('homey');

// Extending the `homey` module object itself threw
// "Class extends value #<Object> is not a constructor" the moment this driver
// was loaded, so it could never start on a Homey.
class WaterTankMonitorDriver extends Driver {
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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('Liquid Level Sensor driver initializing...');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["device_air_purifier_water_tank_monitor_state_0d1a2","device_air_purifier_water_tank_monitor_level_c099c","device_air_purifier_water_tank_monitor_low","device_air_purifier_water_tank_monitor_high"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) {return;}
            args.device.emit(`flow:${  _tid}`, args);
          });
        }
      } catch (_err) { this.error(`Trigger ${  _tid  }: ${  _err.message}`); }
    }
    // END TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('device_air_purifier_water_tank_monitor_level_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_air_purifier_water_water_tank_monitor_level_above: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('device_air_purifier_water_tank_monitor_state_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_air_purifier_water_water_tank_monitor_state_is: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = WaterTankMonitorDriver;


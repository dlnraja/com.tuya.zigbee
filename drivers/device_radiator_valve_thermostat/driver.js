'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ThermostatTuyaDpDriver extends ZigBeeDriver {
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
    this.log('ThermostatTuyaDpDriver v5.5.573 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS

    // CONDITIONS
    try {
      // A8: NaN Safety - use safeDivide/safeMultiply
  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_radiator_valve_thermostat_hybrid_thermostat_tuya_dp_is_heating: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('device_radiator_valve_thermostat_tuya_dp_tem_8fe99');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_radiator_valve_thermostat_thermostat_tuya_dp_temperature_above_target: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('device_radiator_valve_thermostat_tuya_dp_tem_2da2f');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_radiator_valve_thermostat_thermostat_tuya_dp_temperature_below_target: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('device_radiator_valve_thermostat_tuya_dp_mode_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_radiator_valve_thermostat_thermostat_tuya_dp_mode_is: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('device_radiator_valve_thermostat_tuya_dp_chi_2c8e8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_radiator_valve_thermostat_thermostat_tuya_dp_child_lock_is: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('device_radiator_valve_thermostat_tuya_dp_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_radiator_valve_thermostat_thermostat_tuya_dp_is_on: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_set_01c72');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_target_temperature: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_set_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_mode triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_mode: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_inc_8b664');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action device_radiator_valve_thermostat_thermostat_tuya_dp_increase_temperature triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_increase_temperature: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_dec_6e5ef');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action device_radiator_valve_thermostat_thermostat_tuya_dp_decrease_temperature triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_decrease_temperature: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_set_fa7a8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_child_lock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_child_lock: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_set_e140c');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_comfort_preset triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_comfort_preset: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_sch_b7ab8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_schedule_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_sch_7e2b1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_schedule_off: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_turn_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_turn_off: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_toggle: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_thermostat_tuya_dp_set_b2909');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_thermostat_thermostat_tuya_dp_set_temperature: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
    }
}
module.exports = ThermostatTuyaDpDriver;

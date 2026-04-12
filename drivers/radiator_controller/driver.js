'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Removed non-existent flow card registrations
 * Flow cards must be defined in driver.flow.compose.json first
 */
class RadiatorControllerDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }


  async onInit() {
    this.homey.flow.getActionCard('radiator_controller_set_temperature_offset');
    this.homey.flow.getActionCard('radiator_controller_send_pilot_signal');
    this.homey.flow.getActionCard('radiator_controller_set_heating_mode');
    this.homey.flow.getConditionCard('radiator_controller_heating_mode_is');
    this.homey.flow.getConditionCard('radiator_controller_radiator_is_heating');
    this.homey.flow.getTriggerCard('radiator_controller_pilot_signal_sent');
    this.homey.flow.getTriggerCard('radiator_controller_radiator_mode_changed');
    this.log('RadiatorControllerDriver v5.5.476 initialized');

    try {
      // Register flow triggers
      this._radiator_mode_changedTrigger =
        this.homey.flow.getTriggerCard('radiator_mode_changed');
      this._pilot_signal_sentTrigger =
        this.homey.flow.getTriggerCard('pilot_signal_sent');
      
      // Register flow conditions
      this._radiator_is_heatingCondition =
        this.homey.flow.getConditionCard('radiator_is_heating');
      this._heating_mode_isCondition =
        this.homey.flow.getConditionCard('heating_mode_is');
      
      // Register flow actions
      this._set_heating_modeAction =
        this.homey.flow.getActionCard('set_heating_mode');
      if (this._set_heating_modeAction) {
        this._set_heating_modeAction.registerRunListener(async (args) => {
          const { device } = args;
          // TODO: Implement action logic
          return true;
        });
      }
      
      this._send_pilot_signalAction =
        this.homey.flow.getActionCard('send_pilot_signal');
      if (this._send_pilot_signalAction) {
        this._send_pilot_signalAction.registerRunListener(async (args) => {
          const { device } = args;
          // TODO: Implement action logic
          return true;
        });
      }
      
      this._set_temperature_offsetAction =
        this.homey.flow.getActionCard('set_temperature_offset');
      if (this._set_temperature_offsetAction) {
        this._set_temperature_offsetAction.registerRunListener(async (args) => {
          const { device } = args;
          // TODO: Implement action logic
          return true;
        });
      }
      
      this.log('radiator_controller: Flow cards registered');
    } catch (err) {
      this.error('[FLOW] Failed to register flow cards:', err.message);
    }
  }
}

module.exports = RadiatorControllerDriver;
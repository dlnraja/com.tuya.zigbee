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
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    try {
      const driverId = 'radiator_controller';

      // Register flow triggers
      this._radiator_mode_changedTrigger = this._getFlowCard(`${driverId
  
  
  }_radiator_mode_changed`, 'trigger');
      this._pilot_signal_sentTrigger = this._getFlowCard(`${driverId}_pilot_signal_sent`, 'trigger');
      
      // Register flow conditions
      this._radiator_is_heatingCondition = this._getFlowCard(`${driverId}_radiator_is_heating`, 'condition');
      this._heating_mode_isCondition = this._getFlowCard(`${driverId}_heating_mode_is`, 'condition');
      
      // Register flow actions
      this._set_heating_modeAction = this._getFlowCard(`${driverId}_set_heating_mode`, 'action');
      if (this._set_heating_modeAction) {
        this._set_heating_modeAction.registerRunListener(async (args) => {
          const { device } = args;
          // TODO: Implement action logic
          return true;
        });
      }
      
      this._send_pilot_signalAction = this._getFlowCard(`${driverId}_send_pilot_signal`, 'action');
      if (this._send_pilot_signalAction) {
        this._send_pilot_signalAction.registerRunListener(async (args) => {
          const { device } = args;
          // TODO: Implement action logic
          return true;
        });
      }
      
      this._set_temperature_offsetAction = this._getFlowCard(`${driverId}_set_temperature_offset`, 'action');
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
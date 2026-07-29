'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Removed non-existent flow card registrations
 * Flow cards must be defined in driver.flow.compose.json first
 *
 * v9.x: Enregistrement des flow cards définies inline dans driver.compose.json
 * (triggers, conditions, actions fil pilote / mode chauffage).
 */
class RadiatorControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadiatorControllerDriver v5.5.476 initialized');

    // Triggers (déclenchés depuis device.js)
    this._radiatorModeChangedCard = this.homey.flow.getDeviceTriggerCard('radiator_mode_changed');
    this._pilotSignalSentCard = this.homey.flow.getDeviceTriggerCard('pilot_signal_sent');

    // Conditions
    this.homey.flow.getDeviceConditionCard('radiator_is_heating')
      .registerRunListener(async ({ device }) => {
        return !!device.currentMode && device.currentMode !== 'off';
      });

    this.homey.flow.getDeviceConditionCard('heating_mode_is')
      .registerRunListener(async ({ device, mode }) => {
        return device.currentMode === mode;
      });

    // Actions
    this.homey.flow.getDeviceActionCard('set_heating_mode')
      .registerRunListener(async ({ device, mode }) => {
        return device._setHeatingMode(mode);
      });

    this.homey.flow.getDeviceActionCard('send_pilot_signal')
      .registerRunListener(async ({ device, signal }) => {
        return device._sendPilotWireSignal(signal);
      });

    this.homey.flow.getDeviceActionCard('set_temperature_offset')
      .registerRunListener(async ({ device, offset }) => {
        return device._setTemperatureOffset(offset);
      });
  }
}

module.exports = RadiatorControllerDriver;

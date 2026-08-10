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
    try {
      const flow = this.homey.flow;
      this._radiatorModeChangedCard = (typeof flow.getDeviceTriggerCard === 'function'
        ? flow.getDeviceTriggerCard('radiator_mode_changed')
        : null)
        || (typeof flow.getTriggerCard === 'function'
          ? flow.getTriggerCard('radiator_mode_changed')
          : null);
      this._pilotSignalSentCard = (typeof flow.getDeviceTriggerCard === 'function'
        ? flow.getDeviceTriggerCard('pilot_signal_sent')
        : null)
        || (typeof flow.getTriggerCard === 'function'
          ? flow.getTriggerCard('pilot_signal_sent')
          : null);
    } catch (e) {
      this.log('[Flow] triggers', e.message);
    }

    // Conditions — SDK3-safe getters
    const regCond = (id, fn) => {
      try {
        const flow = this.homey.flow;
        const card = (typeof flow.getConditionCard === 'function' ? flow.getConditionCard(id) : null)
          || (typeof flow.getDeviceConditionCard === 'function' ? flow.getDeviceConditionCard(id) : null);
        if (card && typeof card.registerRunListener === 'function') {
          card.registerRunListener(fn);
        }
      } catch (e) {
        this.log('[Flow]', id, e.message);
      }
    };
    regCond('radiator_is_heating', async ({ device }) => {
      return !!device.currentMode && device.currentMode !== 'off';
    });
    regCond('heating_mode_is', async ({ device, mode }) => {
      return device.currentMode === mode;
    });

    // Actions — prefer getActionCard; fall back via app.js FLOW-GUARD polyfill
    const regAction = (id, fn) => {
      try {
        const flow = this.homey.flow;
        const getter = (typeof flow.getActionCard === 'function' && flow.getActionCard)
          || (typeof flow.getDeviceActionCard === 'function' && flow.getDeviceActionCard);
        if (typeof getter !== 'function') {
          this.log('[Flow] no action-card getter for', id);
          return;
        }
        const card = getter.call(flow, id);
        if (card && typeof card.registerRunListener === 'function') {
          card.registerRunListener(fn);
        }
      } catch (e) {
        this.log('[Flow]', id, e.message);
      }
    };
    regAction('set_heating_mode', async ({ device, mode }) => device._setHeatingMode(mode));
    regAction('send_pilot_signal', async ({ device, signal }) => device._sendPilotWireSignal(signal));
    regAction('set_temperature_offset', async ({ device, offset }) => device._setTemperatureOffset(offset));
  }
}

module.exports = RadiatorControllerDriver;

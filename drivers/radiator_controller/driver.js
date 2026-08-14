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
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('radiator_controller_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] radiator_controller_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('radiator_controller_turn_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', true).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', true).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] radiator_controller_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('radiator_controller_turn_off');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', false).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', false).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] radiator_controller_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('radiator_controller_toggle');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !args.device.getCapabilityValue('onoff');
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] radiator_controller_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('radiator_controller_set_temperature');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('target_temperature', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('target_temperature', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] radiator_controller_set_temperature:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('set_temperature_offset');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('target_temperature', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('target_temperature', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] set_temperature_offset:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

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

    // P130: compose also declares radiator_controller_turn_on/off/toggle/set_temperature
    regAction('radiator_controller_turn_on', async ({ device }) => {
      if (typeof device._setHeatingMode === 'function') {
        return device._setHeatingMode('confort');
      }
      if (device.hasCapability?.('onoff')) {
        try { await device.triggerCapabilityListener('onoff', true); } catch (_) {
          await device.safeSetCapabilityValue?.('onoff', true);
        }
      }
      return true;
    });
    regAction('radiator_controller_turn_off', async ({ device }) => {
      if (typeof device._setHeatingMode === 'function') {
        return device._setHeatingMode('off');
      }
      if (device.hasCapability?.('onoff')) {
        try { await device.triggerCapabilityListener('onoff', false); } catch (_) {
          await device.safeSetCapabilityValue?.('onoff', false);
        }
      }
      return true;
    });
    regAction('radiator_controller_toggle', async ({ device }) => {
      const mode = device.currentMode;
      const next = (!mode || mode === 'off') ? 'confort' : 'off';
      if (typeof device._setHeatingMode === 'function') {
        return device._setHeatingMode(next);
      }
      return true;
    });
    regAction('radiator_controller_set_temperature', async ({ device, temperature }) => {
      if (device.hasCapability?.('target_temperature')) {
        try {
          await device.triggerCapabilityListener('target_temperature', Number(temperature));
        } catch (_) {
          await device.safeSetCapabilityValue?.('target_temperature', Number(temperature));
        }
      }
      return true;
    });
    regCond('radiator_controller_is_on', async ({ device }) => {
      return !!device.currentMode && device.currentMode !== 'off';
    });
  }
}

module.exports = RadiatorControllerDriver;

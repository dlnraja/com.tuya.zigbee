'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards, setActuatorCapability } = require('../../lib/flow/ActuatorFlowHelper');
const { safeSetTimeout } = require('../../lib/utils/safe-timers');

/**
 * P130: Restore real getActionCard wiring (was stubbed with `const card = null`).
 */
class PlugSmartDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('device_plug_smart_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] device_plug_smart_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_plug_smart_turn_on');
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
    } catch (e) { this.error('[FLOW] device_plug_smart_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_plug_smart_turn_off');
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
    } catch (e) { this.error('[FLOW] device_plug_smart_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_plug_smart_toggle');
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
    } catch (e) { this.error('[FLOW] device_plug_smart_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_plug_smart_turn_on_delay');
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
    } catch (e) { this.error('[FLOW] device_plug_smart_turn_on_delay:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_plug_smart_turn_off_delay');
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
    } catch (e) { this.error('[FLOW] device_plug_smart_turn_off_delay:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    registerOnoffFlowCards(this, 'device_plug_smart');

    const regDelay = (id, value) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (!card) { return; }
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const delayMs = Number(args.delay || 10) * 1000;
          safeSetTimeout(args.device, () => {
            setActuatorCapability(args.device, 'onoff', value).catch(() => {});
          }, delayMs);
          return true;
        });
      } catch (err) {
        this.log(`[FLOW] ${id}: ${err.message}`);
      }
    };

    regDelay('device_plug_smart_turn_on_delay', true);
    regDelay('device_plug_smart_turn_off_delay', false);

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_set_indicator');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          if (args.device.hasCapability?.('indicator_mode')) {
            return setActuatorCapability(args.device, 'indicator_mode', args.mode ?? args.value);
          }
          return true;
        });
      }
    } catch (_) { /* optional */ }

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_set_power_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          if (args.device.hasCapability?.('power_on_behavior')) {
            return setActuatorCapability(args.device, 'power_on_behavior', args.mode ?? args.value);
          }
          return true;
        });
      }
    } catch (_) { /* optional */ }

    this.log('[FLOW] Smart plug flow cards registered (P130)');
  }
}

module.exports = PlugSmartDriver;

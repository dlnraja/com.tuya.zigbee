'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class Dimmer4chDriver extends ZigBeeDriver {
  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('dimmer_4ch_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] dimmer_4ch_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('dimmer_4ch_turn_on');
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
    } catch (e) { this.error('[FLOW] dimmer_4ch_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('dimmer_4ch_turn_off');
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
    } catch (e) { this.error('[FLOW] dimmer_4ch_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('dimmer_4ch_toggle');
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
    } catch (e) { this.error('[FLOW] dimmer_4ch_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('dimmer_4ch_set_dim');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] dimmer_4ch_set_dim:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerOnoffFlowCards(this, 'dimmer_4ch', { registerDim: true });
    this.log('[FLOW] 4-channel dimmer actuator cards registered (P130)');
  }
}

module.exports = Dimmer4chDriver;

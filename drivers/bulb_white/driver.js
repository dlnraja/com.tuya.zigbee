'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards, setActuatorCapability } = require('../../lib/flow/ActuatorFlowHelper');

/**
 * P130: Flow card IDs must match driver.flow.compose.json (bulb_white_*),
 * not the old bulb_white_smart_bulb_white_* prefix.
 */
class SmartBulbWhiteDriver extends ZigBeeDriver {
  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('bulb_white_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] bulb_white_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('bulb_white_turn_on');
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
    } catch (e) { this.error('[FLOW] bulb_white_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('bulb_white_turn_off');
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
    } catch (e) { this.error('[FLOW] bulb_white_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('bulb_white_toggle');
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
    } catch (e) { this.error('[FLOW] bulb_white_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('bulb_white_set_dim');
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
    } catch (e) { this.error('[FLOW] bulb_white_set_dim:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerOnoffFlowCards(this, 'bulb_white', { registerDim: true });

    try {
      const card = this.homey.flow.getActionCard('bulb_white_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const raw = args.brightness ?? args.dim ?? args.value;
          if (raw == null) { return false; }
          return setActuatorCapability(args.device, 'dim', Number(raw));
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_white_set_brightness: ${err.message}`);
    }

    this.log('[FLOW] White bulb flow cards registered (P130)');
  }
}

module.exports = SmartBulbWhiteDriver;

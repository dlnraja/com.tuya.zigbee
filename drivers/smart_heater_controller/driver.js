'use strict';

const { Driver } = require('homey');

class SmartHeaterControllerDriver extends Driver {
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
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('smart_heater_controller_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] smart_heater_controller_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('smart_heater_controller_turn_on');
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
    } catch (e) { this.error('[FLOW] smart_heater_controller_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('smart_heater_controller_turn_off');
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
    } catch (e) { this.error('[FLOW] smart_heater_controller_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('smart_heater_controller_toggle');
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
    } catch (e) { this.error('[FLOW] smart_heater_controller_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('smart_heater_controller_set_temperature');
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
    } catch (e) { this.error('[FLOW] smart_heater_controller_set_temperature:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('Smart Heater Controller driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try {
      this.homey.flow.getActionCard(id).registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('smart_heater_controller_turn_on', async ({ device }) => { await device['setCapabilityValue']('onoff', true); return true; });
    // v5.13.3: Condition handler



    reg('smart_heater_controller_turn_off', async ({ device }) => { await device['setCapabilityValue']('onoff', false); return true; });
    reg('smart_heater_controller_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device['setCapabilityValue']('onoff', !v); return true; });

  }
}

module.exports = SmartHeaterControllerDriver;

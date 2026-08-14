'use strict';

const { Driver } = require('homey');

class HumidifierDriver extends Driver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
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
      const __card = this.homey.flow.getConditionCard('device_air_purifier_humidifier_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] device_air_purifier_humidifier_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_air_purifier_humidifier_turn_on');
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
    } catch (e) { this.error('[FLOW] device_air_purifier_humidifier_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_air_purifier_humidifier_turn_off');
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
    } catch (e) { this.error('[FLOW] device_air_purifier_humidifier_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_air_purifier_humidifier_toggle');
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
    } catch (e) { this.error('[FLOW] device_air_purifier_humidifier_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('device_air_purifier_humidifier_set_brightness');
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
    } catch (e) { this.error('[FLOW] device_air_purifier_humidifier_set_brightness:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('Humidifier driver initialized');

    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {card.registerRunListener(fn);}
      } catch (e) {
        this.error(`Error registering flow card ${id}:`, e.message);
      }
    };

    reg('humidifier_turn_on', async ({ device }) => { 
      await device['setCapabilityValue']('onoff', true); 
      return true; 
    });
    reg('humidifier_turn_off', async ({ device }) => { 
      await device['setCapabilityValue']('onoff', false); 
      return true; 
    });
    reg('humidifier_toggle', async ({ device }) => { 
      const v = device.getCapabilityValue('onoff'); 
      await device['setCapabilityValue']('onoff', !v); 
      return true; 
    });
  }
}

module.exports = HumidifierDriver;

'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AirPurifierDriver extends ZigBeeDriver {
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

    this.log('Air Purifier Driver initialized');
    const triggers = ['air_purifier_turned_on', 'air_purifier_turned_off', 'air_purifier_pm25_changed'];
    for (const id of triggers) {
  
  
  
  
  
  
  } catch (e) { this.error(`Trigger ${id}: ${e.message}`);   }
    try {  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.speed * 100);
          return true;
        });
      }
    } catch (e) { this.error('Action set_fan_speed:', e.message); }
    try {  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (e) { this.error('Action turn_on:', e.message); }
    try {  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (e) { this.error('Action turn_off:', e.message); }
    try {  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', !args.device.getCapabilityValue('onoff'));
          return true;
        });
      }
    } catch (e) { this.error('Action toggle:', e.message); }
    try {  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness * 100);
          return true;
        });
      }
    } catch (e) { this.error('Action set_brightness:', e.message);   }
}

}
module.exports = AirPurifierDriver;


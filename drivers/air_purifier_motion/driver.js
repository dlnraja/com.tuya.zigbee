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
    
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(fn);
      } catch (e) { this.error(`Action ${id}: ${e.message}`); }
    };

    reg('set_fan_speed', async ({ device, speed }) => {
      await device.triggerCapabilityListener('dim', speed * 100);
      return true;
    });

    reg('turn_on', async ({ device }) => {
      await device._setGangOnOff(1, true).catch(() => {});
      await device.setCapabilityValue('onoff', true).catch(() => {});
      return true;
    });

    reg('turn_off', async ({ device }) => {
      await device._setGangOnOff(1, false).catch(() => {});
      await device.setCapabilityValue('onoff', false).catch(() => {});
      return true;
    });

    reg('toggle', async ({ device }) => {
      const current = device.getCapabilityValue('onoff');
      await device.triggerCapabilityListener('onoff', !current);
      return true;
    });

    reg('set_brightness', async ({ device, brightness }) => {
      await device.triggerCapabilityListener('dim', brightness * 100);
      return true;
    });
  }
}

module.exports = AirPurifierDriver;

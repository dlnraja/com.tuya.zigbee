'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class FingerbotDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('FingerbotDriver v5.13.3 initialized');

    // v5.13.3: Register flow card action/condition handlers (#162)
    const reg = (type, id, fn) => {
      try { this.homey.flow[type](id).registerRunListener(fn); 
  
  
  
  
  
  
  }
      catch (e) { this.log(`[Flow] ${id} skip: ${e.message}`); }
    };

    reg('getActionCard', 'fingerbot_push', async ({ device }) => {
      await device.triggerFingerBotPress();
      });
    reg('getActionCard', 'fingerbot_turn_on', async ({ device }) => {
      await device.setCapabilityValue('onoff', true).catch(() => {});
      await device.flowSetOnOff(true); // P3050: sendTuyaDP does not exist here; same path as the onoff UI
      });
    reg('getActionCard', 'fingerbot_turn_off', async ({ device }) => {
      await device.setCapabilityValue('onoff', false).catch(() => {});
      await device.flowSetOnOff(false); // P3050: sendTuyaDP does not exist here; same path as the onoff UI
      });
    reg('getActionCard', 'fingerbot_toggle', async ({ device }) => {
      const cur = device.getCapabilityValue('onoff');
      await device.setCapabilityValue('onoff', !cur).catch(() => {});
      await device.flowSetOnOff(!cur); // P3050: sendTuyaDP does not exist here; same path as the onoff UI
      });
    reg('getConditionCard', 'fingerbot_is_on', async ({ device }) => {
      return device.getCapabilityValue('onoff') === true;
      });
  }

}

module.exports = FingerbotDriver;

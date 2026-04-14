'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedControllerRgbDriver extends ZigBeeDriver {
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

    this.log('LedControllerRgbDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try {
      this.homey.flow.getActionCard(id).registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('led_controller_rgb_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler



    reg('led_controller_rgb_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('led_controller_rgb_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }

}

module.exports = LedControllerRgbDriver;

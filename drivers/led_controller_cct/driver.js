'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedControllerCctDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('LedControllerCctDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try {
      (() => { try { return this.homey.flow.getActionCard(id); } catch(e) { return null; } })()?.registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('led_controller_cct_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler



    reg('led_controller_cct_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('led_controller_cct_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }

}

module.exports = LedControllerCctDriver;

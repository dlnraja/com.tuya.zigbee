'use strict';

const { Driver } = require('homey');

class HumidifierDriver extends Driver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('Humidifier driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try {
      (() => { try { return this.homey.flow.getActionCard(id); } catch(e) { return null; } })()?.registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('humidifier_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler



    reg('humidifier_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('humidifier_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }
}

module.exports = HumidifierDriver;

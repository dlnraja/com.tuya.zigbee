'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 */
class Dimmer3GangDriver extends ZigBeeDriver {
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

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;









     // v5.5.534: SDK3 CRITICAL
    this.log('3-Gang Dimmer Driver v5.5.534 initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try {
      this.homey.flow.getActionCard(id).registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('dimmer_3gang_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler



    reg('dimmer_3gang_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('dimmer_3gang_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }
}

module.exports = Dimmer3GangDriver;

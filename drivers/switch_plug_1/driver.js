'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchPlug1Driver extends ZigBeeDriver {
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

    this.log('SwitchPlug1Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);
  
  
  
  
  
  
  }catch(e){this.log('[Flow]',i,e.message);}};
    r('switch_plug_1_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    r('switch_plug_1_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    r('switch_plug_1_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
  }

}

module.exports = SwitchPlug1Driver;

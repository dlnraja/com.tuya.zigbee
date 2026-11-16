'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchPlug1Driver extends ZigBeeDriver {
  // P3331: dormant host (lib/drivers/held-driver-folds.json): an exact hosted couple runs its held device class.
  onMapDeviceClass(device) {
    return require('../../lib/drivers/HeldDriverFolds').foldedDeviceClass('switch_plug_1', device) || require('./device');
  }

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
    require('../../lib/drivers/HeldDriverFolds').registerHostedFlows(this, 'switch_plug_1'); // P3331

    this.log('SwitchPlug1Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);
  
  
  
  
  
  
  }catch(e){this.log('[Flow]',i,e.message);}};
    r('switch_plug_1_turn_on',async({device})=>{await device['setCapabilityValue']('onoff',true);return true;});
    r('switch_plug_1_turn_off',async({device})=>{await device['setCapabilityValue']('onoff',false);return true;});
    r('switch_plug_1_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device['setCapabilityValue']('onoff',!v);return true;});
  }

}

module.exports = SwitchPlug1Driver;

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 */
class USBHubDualDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit(); // v5.5.534: SDK3 CRITICAL
    this.log('USB Hub Dual Driver v5.5.534 initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('usb_dongle_dual_repeater_turn_on',async({device})=>{await device.setCapabilityValue('onoff',true);return true;});
    r('usb_dongle_dual_repeater_turn_off',async({device})=>{await device.setCapabilityValue('onoff',false);return true;});
    r('usb_dongle_dual_repeater_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.setCapabilityValue('onoff',!v);return true;});
  }
}

module.exports = USBHubDualDriver;

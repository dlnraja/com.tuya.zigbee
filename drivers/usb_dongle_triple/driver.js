'use strict';

const { Driver } = require('homey');

class UsbDongleTripleDriver extends Driver {
  async onInit() {
    this.log('USB Dongle Triple driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getDeviceActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('usb_dongle_triple_all_on',async({device})=>{for(const c of['onoff','onoff.gang2','onoff.gang3'])if(device.hasCapability(c))await device.triggerCapabilityListener(c,true);return true;});
    r('usb_dongle_triple_all_off',async({device})=>{for(const c of['onoff','onoff.gang2','onoff.gang3'])if(device.hasCapability(c))await device.triggerCapabilityListener(c,false);return true;});
  }
}

module.exports = UsbDongleTripleDriver;

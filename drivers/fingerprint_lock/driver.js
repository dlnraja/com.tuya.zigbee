'use strict';

const { Driver } = require('homey');

class FingerprintLockDriver extends Driver {
  async onInit() {
    this.log('Fingerprint Lock driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn)}catch(e){this.log('[Flow]',i,e.message)}};
    r('fingerprint_lock_lock',async({device})=>{await device.setCapabilityValue('locked',true);return true});
    r('fingerprint_lock_unlock',async({device})=>{await device.setCapabilityValue('locked',false);return true});
  }
}

module.exports = FingerprintLockDriver;

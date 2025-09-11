'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaUniversalAdapterDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();
    
    this.log('Universal Tuya Device Adapter driver initialized');
    
    
  }

  

}

module.exports = TuyaUniversalAdapterDriver;
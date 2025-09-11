'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601LockDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();
    
    this.log('Tuya Smart Door Lock driver initialized');
    
    
  }

  

}

module.exports = Ts0601LockDriver;
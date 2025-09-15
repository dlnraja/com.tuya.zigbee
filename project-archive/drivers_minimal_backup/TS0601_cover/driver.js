'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601CoverDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();
    
    this.log('Tuya Smart Curtain/Blind Controller driver initialized');
    
    
  }

  

}

module.exports = Ts0601CoverDriver;
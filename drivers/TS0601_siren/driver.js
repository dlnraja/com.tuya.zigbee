'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601SirenDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();
    
    this.log('Tuya Smart Siren/Alarm driver initialized');
    
    
  }

  

}

module.exports = Ts0601SirenDriver;
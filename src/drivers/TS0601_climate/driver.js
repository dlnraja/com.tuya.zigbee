'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601ClimateDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();
    
    this.log('Tuya Smart Thermostat/Climate Controller driver initialized');
    
    
  }

  

}

module.exports = Ts0601ClimateDriver;
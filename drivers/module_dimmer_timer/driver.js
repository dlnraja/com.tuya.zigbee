'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DimmerSwitchTimerModuleDriver extends ZigBeeDriver {

  async onInit() {
    this.log('DimmerSwitchTimerModuleDriver initialized');
  }
}

module.exports = DimmerSwitchTimerModuleDriver;

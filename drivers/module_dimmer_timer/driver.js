'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoDimmerSwitchTimerModuleDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoDimmerSwitchTimerModuleDriver initialized');
  }
}

module.exports = AvattoDimmerSwitchTimerModuleDriver;

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSolarPanelControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSolarPanelControllerDriver initialized');
  }
}

module.exports = ZemismartSolarPanelControllerDriver;

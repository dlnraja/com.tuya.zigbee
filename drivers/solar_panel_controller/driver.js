'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SolarPanelControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SolarPanelControllerDriver initialized');
  }
}

module.exports = SolarPanelControllerDriver;

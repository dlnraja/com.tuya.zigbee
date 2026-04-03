'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchPlug1Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchPlug1Driver initialized');
  }

}

module.exports = SwitchPlug1Driver;

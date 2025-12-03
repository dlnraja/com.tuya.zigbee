'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchPlug2Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchPlug2Driver initialized');
  }

}

module.exports = SwitchPlug2Driver;

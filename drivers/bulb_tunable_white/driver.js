'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoBulbTunableDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoBulbTunableDriver initialized');
  }
}

module.exports = AvattoBulbTunableDriver;

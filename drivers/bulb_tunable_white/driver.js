'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BulbTunableDriver extends ZigBeeDriver {

  async onInit() {
    this.log('BulbTunableDriver initialized');
  }
}

module.exports = BulbTunableDriver;

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSamsungOutletDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSamsungOutletDriver initialized');
  }
}

module.exports = AvattoSamsungOutletDriver;

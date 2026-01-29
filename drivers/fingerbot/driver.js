'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class FingerbotDriver extends ZigBeeDriver {

  async onInit() {
    this.log('FingerbotDriver v5.5.959 initialized');
  }

}

module.exports = FingerbotDriver;

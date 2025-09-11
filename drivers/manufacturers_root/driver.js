'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ManufacturersRootDriver extends ZigBeeDriver {

  onInit() {
    this.log('manufacturers_root driver initialized');
    super.onInit();
  }

}

module.exports = ManufacturersRootDriver;

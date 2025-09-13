'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TypesDriver extends ZigBeeDriver {

  onInit() {
    this.log('types driver initialized');
    super.onInit();
  }

}

module.exports = TypesDriver;

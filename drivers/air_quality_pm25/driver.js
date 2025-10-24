'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartPm25DetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartPm25DetectorDriver initialized');
  }
}

module.exports = ZemismartPm25DetectorDriver;

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TS130FLightDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('🚀 TS130F Light driver init');
  }
}

module.exports = TS130FLightDriver;

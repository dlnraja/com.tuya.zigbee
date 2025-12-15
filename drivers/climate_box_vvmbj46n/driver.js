'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Driver for _TZE284_vvmbj46n Climate Box
 * 100% Tuya DP - No Zigbee Time Sync
 */
class ClimateBoxVvmbj46nDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ClimateBoxVvmbj46nDriver initialized');
    this.log('⚠️ This device does NOT support Zigbee Time sync (firmware limitation)');
  }

}

module.exports = ClimateBoxVvmbj46nDriver;

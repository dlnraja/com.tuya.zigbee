'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch2GangDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('wall_switch_2_gang driver initialized');
  }
}

module.exports = WallSwitch2GangDriver;
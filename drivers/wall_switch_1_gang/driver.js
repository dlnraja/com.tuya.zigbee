'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch1GangDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('wall_switch_1_gang driver initialized');
  }
}

module.exports = WallSwitch1GangDriver;
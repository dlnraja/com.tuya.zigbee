'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall3GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall3GangDriver initialized');
  }
}

module.exports = SwitchWall3GangDriver;

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall2GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall2GangDriver initialized');
  }
}

module.exports = SwitchWall2GangDriver;

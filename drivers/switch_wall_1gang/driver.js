'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall1GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall1GangDriver initialized');
  }
}

module.exports = SwitchWall1GangDriver;

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall4GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall4GangDriver initialized');
  }
}

module.exports = SwitchWall4GangDriver;

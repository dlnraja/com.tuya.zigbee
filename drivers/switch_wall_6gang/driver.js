'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall6GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall6GangDriver initialized');
  }
}

module.exports = SwitchWall6GangDriver;

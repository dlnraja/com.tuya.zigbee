'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall7gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall7gangDriver initialized');
  }

}

module.exports = SwitchWall7gangDriver;

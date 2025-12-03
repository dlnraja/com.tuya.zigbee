'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall8gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall8gangDriver initialized');
  }

}

module.exports = SwitchWall8gangDriver;

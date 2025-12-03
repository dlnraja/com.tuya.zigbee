'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch3Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SceneSwitch3Driver initialized');
  }

}

module.exports = SceneSwitch3Driver;

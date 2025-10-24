'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RemoteSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RemoteSwitchDriver initialized');
  }
}

module.exports = RemoteSwitchDriver;

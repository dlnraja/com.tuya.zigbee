'use strict';

const { Driver } = require('homey');

class RemoteSceneTuyaDriver extends Driver {
  async onInit() {
    this.log('Remote Scene Tuya driver initialized');
  }
}

module.exports = RemoteSceneTuyaDriver;

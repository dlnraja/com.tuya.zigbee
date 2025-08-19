'use strict';

const { Driver } = require('homey');

class CoverCurtainTuyaDriver extends Driver {
  async onInit() {
    this.log('Cover Curtain Tuya driver initialized');
  }
}

module.exports = CoverCurtainTuyaDriver;

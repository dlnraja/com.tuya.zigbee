'use strict';

const { Driver } = require('homey');

class LockSmartAdvancedDriver extends Driver {
  
  async onInit() {
    this.log('Smart Lock Advanced driver has been initialized');
  }
}

module.exports = LockSmartAdvancedDriver;

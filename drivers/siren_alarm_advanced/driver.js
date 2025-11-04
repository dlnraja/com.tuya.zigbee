'use strict';

const { Driver } = require('homey');

class SirenAlarmAdvancedDriver extends Driver {
  
  async onInit() {
    this.log('Smart Siren Alarm Advanced driver has been initialized');
  }
}

module.exports = SirenAlarmAdvancedDriver;

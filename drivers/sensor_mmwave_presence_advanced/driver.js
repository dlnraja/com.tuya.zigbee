'use strict';

const { Driver } = require('homey');

class SensorMmwavePresenceAdvancedDriver extends Driver {
  
  async onInit() {
    this.log('mmWave Presence Sensor Advanced driver has been initialized');
  }
}

module.exports = SensorMmwavePresenceAdvancedDriver;

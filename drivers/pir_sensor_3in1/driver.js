'use strict';

const { Driver } = require('homey');

class PIRSensor3in1Driver extends Driver {

  async onInit() {
    this.log('PIR Sensor 3-in-1 Driver initialized');
  }

  async onPair(session) {
    this.log('Pairing PIR Sensor 3-in-1');

    session.setHandler('showView', async (viewId) => {
      this.log(`Showing view: ${viewId}`);
    });
  }
}

module.exports = PIRSensor3in1Driver;

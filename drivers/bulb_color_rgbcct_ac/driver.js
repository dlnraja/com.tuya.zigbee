'use strict';

const { Driver } = require('homey');

/**
 * Smart Bulb Color RGB+CCT (AC) Driver
 */
class BulbColorRgbcctAcDriver extends Driver {

  async onInit() {
    this.log('bulb_color_rgbcct_ac driver initialized');
  }

  async onPair(session) {
    this.log('Pairing bulb_color_rgbcct_ac...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = BulbColorRgbcctAcDriver;

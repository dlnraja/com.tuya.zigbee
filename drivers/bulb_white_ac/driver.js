'use strict';

const { Driver } = require('homey');

/**
 * Bulb White Ac Driver
 */
class BulbWhiteAcDriver extends Driver {

  async onInit() {
    this.log('bulb_white_ac driver initialized');
  }

}

module.exports = BulbWhiteAcDriver;

'use strict';

const { Driver } = require('homey');

/**
 * Bulb White Ambiance Ac Driver
 */
class BulbWhiteAmbianceAcDriver extends Driver {

  async onInit() {
    this.log('bulb_white_ambiance_ac driver initialized');
  }

}

module.exports = BulbWhiteAmbianceAcDriver;

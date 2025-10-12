'use strict';

const { Driver } = require('homey');

/**
 * Led Strip Outdoor Color Ac Driver
 */
class LedStripOutdoorColorAcDriver extends Driver {

  async onInit() {
    this.log('led_strip_outdoor_color_ac driver initialized');
  }

}

module.exports = LedStripOutdoorColorAcDriver;

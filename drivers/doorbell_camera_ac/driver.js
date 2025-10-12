'use strict';

const { Driver } = require('homey');

/**
 * Doorbell Camera Ac Driver
 */
class DoorbellCameraAcDriver extends Driver {

  async onInit() {
    this.log('doorbell_camera_ac driver initialized');
  }

}

module.exports = DoorbellCameraAcDriver;

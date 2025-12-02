'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class CurtainMotorTiltDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Curtain Motor with Tilt initialized');
  }
}

module.exports = CurtainMotorTiltDevice;

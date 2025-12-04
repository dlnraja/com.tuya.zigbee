'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class CurtainMotorTiltDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Curtain Motor with Tilt initialized');
  }
}

module.exports = CurtainMotorTiltDevice;

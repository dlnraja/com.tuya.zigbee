'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

class PresenceSensorDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Presence Sensor hybrid initialized');
  }

  handleTuyaDataReport(data) {
     this.log('Presence DP:', data.dp, data.value);
  }
}

module.exports = PresenceSensorDevice;

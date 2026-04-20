'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

class ClimateSensorDimmerDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Climate Sensor Dimmer hybrid initialized');
  }

  handleTuyaDataReport(data) {
     this.log('Climate/Dimmer DP:', data.dp, data.value);
  }
}

module.exports = ClimateSensorDimmerDevice;

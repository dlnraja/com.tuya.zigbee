'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

class ClimateSensorPresenceDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Climate Sensor Presence hybrid initialized');
  }

  handleTuyaDataReport(data) {
     this.log('Climate/Presence DP:', data.dp, data.value);
  }
}

module.exports = ClimateSensorPresenceDevice;

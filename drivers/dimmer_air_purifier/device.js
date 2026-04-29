'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
class DimmerAirPurifierDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) { await super.onNodeInit({ zclNode }); }
  handleTuyaDataReport(data) { this.log('DP:', data.dp, data.value); }
}
module.exports = DimmerAirPurifierDevice;
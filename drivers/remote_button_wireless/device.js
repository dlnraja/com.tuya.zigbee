'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class RemoteButtonWirelessDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Remote Button Wireless v5.9.12 Ready');

    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]).catch(this.error.bind(this));
    } catch (err) {
      this.error('Config error:', err.message);
    }
  }
}

module.exports = RemoteButtonWirelessDevice;

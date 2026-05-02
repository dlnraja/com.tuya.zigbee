'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class UsbDongleTripleDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('USB Dongle Triple v5.9.12 Ready');

    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]).catch(e => this.log('[USB_TRIPLE] config failed:', e.message));
    } catch (err) {
      this.error('Config error:', err.message);
    }
  }
}

module.exports = UsbDongleTripleDevice;

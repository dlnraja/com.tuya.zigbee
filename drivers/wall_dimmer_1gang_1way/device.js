'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class WallDimmer1Gang1WayDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Wall Dimmer 1-Gang 1-Way v5.9.12 Ready');
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'onoff') {
      await this.sendTuyaCommand(1, value, 'bool');
    }
    return super.setCapabilityValue(capability, value);
  }

  async sendTuyaCommand(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya) {
      await tuya.datapoint({ dp, value, type }).catch(err => {
        this.log('Tuya command failed:', err.message);
      });
    }
  }
}

module.exports = WallDimmer1Gang1WayDevice;

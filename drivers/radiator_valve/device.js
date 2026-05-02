'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class RadiatorValveDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Radiator Valve v5.9.12 Ready');

    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (v) => {
        await this._sendTuyaDP(1, v, 'bool');
      });
    }
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya) {
      await tuya.datapoint({ dp, value, type });
    }
  }
}

module.exports = RadiatorValveDevice;

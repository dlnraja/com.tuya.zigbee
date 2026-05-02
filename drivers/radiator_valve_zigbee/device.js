'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class RadiatorValveZigBeeDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Radiator Valve ZigBee v5.9.12 Ready');
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'target_temperature') {
      await this.sendTuyaDPCommand(1, Math.round(value * 10));
    }
    return super.setCapabilityValue(capability, value);
  }

  async sendTuyaDPCommand(dp, value) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya) {
      await tuya.datapoint({ dp, value, type: 'value' });
    }
  }
}

module.exports = RadiatorValveZigBeeDevice;

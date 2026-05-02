'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Switch2GangDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('2-Gang Switch v5.9.12 Ready');

    for (let i = 1; i <= 2; i++) {
      const ep = zclNode.endpoints[i];
      if (ep && ep.clusters.onOff) {
        const capability = i === 1 ? 'onoff' : `onoff.${i}`;
        ep.clusters.onOff.on('attr.onOff', (value) => {
          this.setCapabilityValue(capability, value).catch(() => {});
        });
      }
    }
  }

  async setCapabilityValue(capability, value) {
    const match = capability.match(/onoff(?:\.(\d+))?/);
    if (match) {
      const gang = match[1] ? parseInt(match[1]) : 1;
      const ep = this.zclNode.endpoints[gang];
      if (ep && ep.clusters.onOff) {
        if (value) await ep.clusters.onOff.setOn();
        else await ep.clusters.onOff.setOff();
      }
    }
    return super.setCapabilityValue(capability, value);
  }
}

module.exports = Switch2GangDevice;

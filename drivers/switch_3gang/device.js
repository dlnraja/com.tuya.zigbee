'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Switch3GangDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('3-Gang Switch v5.9.12 Ready');

    for (let i = 1; i <= 3; i++) {
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
        await ep.clusters.onOff.toggle(); // or set to value
      }
    }
    return super.setCapabilityValue(capability, value);
  }
}

module.exports = Switch3GangDevice;

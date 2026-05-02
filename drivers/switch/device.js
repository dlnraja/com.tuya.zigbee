'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class SwitchDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Switch v5.9.12 Ready');

    const ep = zclNode.endpoints[1];
    if (ep && ep.clusters.onOff) {
      ep.clusters.onOff.on('attr.onOff', (value) => {
        this.setCapabilityValue('onoff', value).catch(() => {});
      });
      this._readInitialState(ep.clusters.onOff);
    }
  }

  async _readInitialState(cluster) {
    try {
      const data = await cluster.readAttributes(['onOff']).catch(() => ({}));
      if (data.onOff != null) {
        this.setCapabilityValue('onoff', data.onOff).catch(() => {});
      }
    } catch (e) {
      this.log('Initial state read failed:', e.message);
    }
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'onoff') {
      const ep = this.zclNode.endpoints[1];
      if (ep && ep.clusters.onOff) {
        if (value) await ep.clusters.onOff.setOn();
        else await ep.clusters.onOff.setOff();
      }
    }
    return super.setCapabilityValue(capability, value);
  }
}

module.exports = SwitchDevice;

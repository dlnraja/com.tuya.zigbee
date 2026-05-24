'use strict';
const { safeParse, safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class DimmerWallSwitchDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Dimmer Wall Switch v5.9.12 Ready');

    const ep = zclNode.endpoints[1];
    if (ep && ep.clusters.levelControl) {
      ep.clusters.levelControl.on('attr.currentLevel', (value) => {
        const dim = value / 254;
        this.setCapabilityValue('dim', dim).catch(() => {});
      });
      this._readInitialLevel(ep.clusters.levelControl);
    }
  }

  async _readInitialLevel(cluster) {
    try {
      const data = await cluster.readAttributes(['currentLevel']).catch(() => ({}));
      if (data.currentLevel != null) {
        this.setCapabilityValue('dim', data.currentLevel / 254).catch(() => {});
      }
    } catch (e) {
      this.log('Initial level read failed:', e.message);
    }
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'dim') {
      const level = Math.round(value * 254);
      const ep = this.zclNode.endpoints[1];
      if (ep && ep.clusters.levelControl) {
        await ep.clusters.levelControl.moveToLevel({ level, transitionTime: 10 });
      }
    }
    return super.setCapabilityValue(capability, value);
  }
}

module.exports = DimmerWallSwitchDevice;

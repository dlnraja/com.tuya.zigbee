'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class CurtainWallDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Curtain Wall Device v5.9.12 Ready');
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'windowcoverings_set') {
      const pos = Math.round(value * 100);
      await this._setPos(pos);
    }
    return super.setCapabilityValue(capability, value);
  }

  async _setPos(pos) {
    const ep = this.zclNode.endpoints[1];
    const cluster = ep.clusters.windowCovering;
    if (cluster) {
      await cluster.goToLiftPercentage({ percentLiftValue: 100 - pos });
    }
  }

  async _handleButtonPress(value) {
    this.log(`[CURTAIN] Button pressed: ${value}`);
    try {
      await this.setCapabilityValue('button', true).catch(() => { });
      setTimeout(() => {
        this.setCapabilityValue('button', false).catch(() => { });
      }, 500);

      const triggerCard = (() => {
        try { return this.homey.flow.getTriggerCard('curtain_button_pressed'); }
        catch (e) { return null; }
      })();
      
      if (triggerCard) {
        await triggerCard.trigger(this, { button: 1, scene: 'pressed' }).catch(() => { });
      }
    } catch (err) {
      this.log('[CURTAIN] Button trigger error:', err.message);
    }
  }

  async onDeleted() {
    await super.onDeleted?.();
  }
}

module.exports = CurtainWallDevice;

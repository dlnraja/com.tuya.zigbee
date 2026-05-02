'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class RemoteDimmerDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Remote Dimmer v5.9.12 Ready');
  }

  async _handleButtonPress(value) {
    this.log(`[DIMMER] Button pressed: ${value}`);
    try {
      const tokens = { button: 1, scene: 'pressed' };
      const trigger = (() => {
        try { return this.homey.flow.getTriggerCard('remote_dimmer_pressed'); }
        catch (e) { return null; }
      })();
      
      if (trigger) {
        await trigger.trigger(this, tokens, {}).catch(() => { });
      }
    } catch (err) {
      this.log('[DIMMER] Button trigger error:', err.message);
    }
  }
}

module.exports = RemoteDimmerDevice;

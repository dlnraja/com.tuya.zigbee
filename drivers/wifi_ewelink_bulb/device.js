'use strict';
const { safeMultiply, safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');
const EweLinkLocalDevice = require('../../lib/ewelink-local/EweLinkLocalDevice');

class EweLinkBulbDevice extends EweLinkLocalDevice {
  get stateMappings() {
    return {
      switch: { capability: 'onoff', transform: v => v === 'on' },
      brightness: { capability: 'dim', transform: v => v * 100 },
      colorR: { capability: 'unknown' },
      colorG: { capability: 'unknown' },
      colorB: { capability: 'unknown' },
      mode: { capability: 'unknown' }
    };
  }

  _registerCapListeners() {
    this.registerCapabilityListener('onoff', async v => {
      await this._client.setSwitch(v);
      });
    this.registerCapabilityListener('dim', async v => {
      await this._client._send('/zeroconf/dimmable', { brightness: Math.round(v * 100) });
      });
  }

  async onInit() {
    if (!this.hasCapability('dim')) {
      try { await this.addCapability('dim'); } catch (e) { }
    }
    await super.onInit();
    this.log('[EWE-BULB] Ready - Dimmable Bulb');
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = EweLinkBulbDevice;

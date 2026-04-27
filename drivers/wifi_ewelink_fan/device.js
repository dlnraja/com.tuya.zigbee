'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const EweLinkLocalDevice = require('../../lib/ewelink-local/EweLinkLocalDevice');

class D extends EweLinkLocalDevice {
  get stateMappings() {
    return {
      switch_0: { capability: 'onoff', transform: v => v === 'on' },
      switch_1: { capability: 'onoff.2', transform: v => v === 'on' },
      speed: { capability: 'dim', transform: v => safeMultiply(v, 3) }
    };
  }

  _registerCapListeners() {
    this.registerCapabilityListener('onoff', async v => { await safeMultiply(this._client.setSwitch(v, 0));
      });
    if (this.hasCapability('onoff.2')) this.registerCapabilityListener('onoff.2', async v => { await safeMultiply(this._client.setSwitch(v, 1));
      });
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async v => {
        const spd = Math.max(1, Math.min(3, Math.round(v)));
        await this._client._send('/zeroconf/fan', { fan: 'on', speed: spd });
      });
    }
  }

  async onInit() {
    for (const c of ['onoff.2', 'dim']) {
      if (!this.hasCapability(c)) try { await this.addCapability(c); } catch (e) {}
    }
    await super.onInit();
    this.log('[EWE-FAN] Ready - iFan03/iFan04');
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = D;

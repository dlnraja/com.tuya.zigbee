'use strict';

const EweLinkLocalDevice = require('../../lib/ewelink-local/EweLinkLocalDevice');

class SonoffDualR3Device extends EweLinkLocalDevice {
  get stateMappings() {
    return {
      switch_0: { capability: 'onoff', transform: v => v === 'on' },
      switch_1: { capability: 'onoff.2', transform: v => v === 'on' },
      current: { capability: 'measure_current', divisor: 1000 },
      voltage: { capability: 'measure_voltage', divisor: 100 },
      actPow: { capability: 'measure_power', divisor: 100 }
    };
  }

  _registerCapListeners() {
    this.registerCapabilityListener('onoff', async v => {
      await this._client.setSwitch(v, 0);
    });
    if (this.hasCapability('onoff.2')) {
      this.registerCapabilityListener('onoff.2', async v => {
        await this._client.setSwitch(v, 1);
      });
    }
  }

  async onInit() {
    for (const c of ['onoff.2', 'measure_power', 'measure_voltage', 'measure_current']) {
      if (!this.hasCapability(c)) await this.addCapability(c).catch(() => {});
    }
    await super.onInit();
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SonoffDualR3Device;

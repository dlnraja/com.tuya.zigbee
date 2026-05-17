'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Dimmer3GangDevice extends ZigBeeDevice {
  _appCommandPending = false;
  _appCommandTimeout = null;
  _lastStates = {};

  async onNodeInit({ zclNode }) {
    this.log('3-Gang Dimmer Ready');
    await this._registerCapabilityListeners();
  }

  _markAppCommand() {
    this._appCommandPending = true;
    if (this._appCommandTimeout) clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => { this._appCommandPending = false; }, 2000);
  }

  async _registerCapabilityListeners() {
    const dps = [
      { dp: 1, cap: 'onoff', type: 'bool' },
      { dp: 2, cap: 'dim', type: 'value' },
      { dp: 7, cap: 'onoff.channel2', type: 'bool' },
      { dp: 8, cap: 'dim.channel2', type: 'value' },
      { dp: 15, cap: 'onoff.channel3', type: 'bool' },
      { dp: 16, cap: 'dim.channel3', type: 'value' }
    ];

    for (const item of dps) {
      if (this.hasCapability(item.cap)) {
        this.registerCapabilityListener(item.cap, async (value) => {
          this._markAppCommand();
          const targetValue = (item.type === 'bool') ? (value ? 1 : 0) : Math.round(value      * 1000);
          this.log(`Sending DP${item.dp} = ${targetValue}`);
      });
      }
    }
  }

  onDeleted() {
    if (this._appCommandTimeout) clearTimeout(this._appCommandTimeout);
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = Dimmer3GangDevice;

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class HeimanSirenDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._cards) {return;}
    this._cards = true;
    const reg = (kind, id, fn) => {
      try { this.homey.flow[kind](id).registerRunListener(fn); } catch (e) { this.error(`${id}: ${e.message}`); }
    };
    reg('getConditionCard', 'heiman_siren_is_on', async ({ device }) => device.getCapabilityValue('onoff') === true);
    reg('getActionCard', 'heiman_siren_start', async ({ device, seconds }) => device.sound(Number(seconds) || 30));
    reg('getActionCard', 'heiman_siren_stop', async ({ device }) => device.sound(0));
  }
}

module.exports = HeimanSirenDriver;

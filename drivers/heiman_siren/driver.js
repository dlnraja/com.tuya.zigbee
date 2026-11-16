'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class HeimanSirenDriver extends ZigBeeDriver {
  /** P3331: also run by the dormant host (smart_rcbo) while this driver is held out of the payload. */
  static registerFlowCards(driver) {
    const reg = (kind, id, fn) => {
      try { driver.homey.flow[kind](id).registerRunListener(fn); } catch (e) { driver.error(`${id}: ${e.message}`); }
    };
    reg('getConditionCard', 'heiman_siren_is_on', async ({ device }) => device.getCapabilityValue('onoff') === true);
    reg('getActionCard', 'heiman_siren_start', async ({ device, seconds }) => device.sound(Number(seconds) || 30));
    reg('getActionCard', 'heiman_siren_stop', async ({ device }) => device.sound(0));
  }

  async onInit() {
    await super.onInit();
    if (this._cards) {return;}
    this._cards = true;
    HeimanSirenDriver.registerFlowCards(this);
  }
}

module.exports = HeimanSirenDriver;

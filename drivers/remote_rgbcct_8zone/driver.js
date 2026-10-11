'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

const D = 'remote_rgbcct_8zone';
const EVENTS = ['on', 'off', 'brightness', 'color_temperature', 'color', 'scene'];

class RemoteRgbCct8ZoneDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    for (const ev of EVENTS) {
      try {
        this.homey.flow.getDeviceTriggerCard(`${D}_${ev}`)
          .registerRunListener(async (args, state) => args.zone === 'any' || Number(args.zone) === Number(state.zone));
      } catch (e) { this.error(`trigger ${ev}: ${e.message}`); }
    }
  }
}

module.exports = RemoteRgbCct8ZoneDriver;

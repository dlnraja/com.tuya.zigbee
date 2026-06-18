'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Dimmer010vDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('Dimmer010vDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggers = ['dimmer_0_10v_turned_on', 'dimmer_0_10v_turned_off'];
    for (const id of triggers) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.error(`Trigger ${id} registration error: ${e.message}`);
      }
    }

    this.log('[FLOW] 0-10V dimmer flow cards registered');
  }
}

module.exports = Dimmer010vDriver;

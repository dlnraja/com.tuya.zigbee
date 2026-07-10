'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Dimmer4chDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('Dimmer4chDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggers = [
      'dimmer_4ch_turned_on',
      'dimmer_4ch_turned_off',
      'dimmer_4ch_ch2_turned_on',
      'dimmer_4ch_ch2_turned_off',
      'dimmer_4ch_ch3_turned_on',
      'dimmer_4ch_ch3_turned_off',
      'dimmer_4ch_ch4_turned_on',
      'dimmer_4ch_ch4_turned_off',
    ];
    for (const id of triggers) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.error(`Trigger ${id} registration error: ${e.message}`);
      }
    }

    this.log('[FLOW] 4-channel dimmer flow cards registered');
  }
}

module.exports = Dimmer4chDriver;

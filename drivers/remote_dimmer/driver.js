'use strict';

const { Driver } = require('homey');

class RemoteDimmerDriver extends Driver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('Remote Control Dimmer driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('remote_dimmer_button_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_dimmer_button_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_dimmer_button_toggle'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_dimmer_brightness_up'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_dimmer_brightness_down'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_dimmer_brightness_stop'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_dimmer_brightness_set'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_dimmer_scene'); } catch (e) {}

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RemoteDimmerDriver;

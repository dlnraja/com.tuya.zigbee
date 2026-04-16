'use strict';

const { Driver } = require('homey');

class RemoteDimmerDriver extends Driver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
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

    // Trigger: ON button pressed

      .registerRunListener(async () => true);

    // Trigger: OFF button pressed

      .registerRunListener(async () => true);

    // Trigger: Toggle button pressed

      .registerRunListener(async () => true);

    // Trigger: Brightness up

      .registerRunListener(async () => true);

    // Trigger: Brightness down

      .registerRunListener(async () => true);

    // Trigger: Brightness stop

      .registerRunListener(async () => true);

    // Trigger: Brightness set

      .registerRunListener(async () => true);

    // Trigger: Scene recalled

      .registerRunListener(async () => true);
  
  
  
  
  
  
  
  }
}

module.exports = RemoteDimmerDriver;


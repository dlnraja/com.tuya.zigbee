'use strict';

const { Driver } = require('homey');

class DinRailMeterDriver extends Driver {
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

    this.log('Din Rail Meter driver initialized');
    try {
      const actionCard =

      if (actionCard) {
        actionCard.registerRunListener(async (args, state) => {
          if (args.device && typeof args.device.resetMeter === 'function') {
            await args.device.resetMeter();
          
  
  
  }
          return true;
        });
      }
    } catch(e) {
      this.log('[Flow]', e.message);
    }
  }
}

module.exports = DinRailMeterDriver;

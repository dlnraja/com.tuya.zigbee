'use strict';

const { Driver } = require('homey');

class IRRemoteDriver extends Driver {
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


    this.log('Zigbee IR Remote driver initialized');

    // Action: Send IR code
    this.homey.flow.getActionCard('send_ir_code')
      .registerRunListener(async (args) => {
        const device = args.device;
        if (!device) throw new Error('No device');
        await device._sendIR(args.ir_code);
      });

    // Action: Start learning
    this.homey.flow.getActionCard('learn_ir_code')
      .registerRunListener(async (args) => {
        const device = args.device;
        if (!device) throw new Error('No device');
        await device._startLearn();
      });
  }
}

module.exports = IRRemoteDriver;

'use strict';

const { Driver } = require('homey');

class IRRemoteDriver extends Driver {
  async onInit() {
    this.log('Zigbee IR Remote driver initialized');

    // Action: Send IR code
    this.homey.flow.getActionCard('ir_remote_send_code')
      .registerRunListener(async (args) => {
        const device = args.device;
        if (!device) throw new Error('No device');
        await device._sendIR(args.ir_code);
      });

    // Action: Start learning
    this.homey.flow.getActionCard('ir_remote_start_learning')
      .registerRunListener(async (args) => {
        const device = args.device;
        if (!device) throw new Error('No device');
        await device._startLearn();
      });
  }
}

module.exports = IRRemoteDriver;

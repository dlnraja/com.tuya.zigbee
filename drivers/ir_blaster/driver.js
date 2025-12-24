'use strict';

const { Driver } = require('homey');

class IrBlasterDriver extends Driver {

  async onInit() {
    this.log('IR Blaster driver initialized');

    // Register flow card actions
    this.sendIrCodeAction = this.homey.flow.getActionCard('send_ir_code');
    this.sendIrCodeAction.registerRunListener(async (args, state) => {
      const device = args.device;
      if (device && device.sendIRCode) {
        await device.sendIRCode(args.ir_code);
      } else {
        throw new Error('Device not ready or missing sendIRCode method');
      }
    });

    this.startIrLearningAction = this.homey.flow.getActionCard('start_ir_learning');
    this.startIrLearningAction.registerRunListener(async (args, state) => {
      const device = args.device;
      if (device && device._enableLearnMode) {
        await device._enableLearnMode(args.duration || 30);
      } else {
        throw new Error('Device not ready or missing _enableLearnMode method');
      }
    });

    this.stopIrLearningAction = this.homey.flow.getActionCard('stop_ir_learning');
    this.stopIrLearningAction.registerRunListener(async (args, state) => {
      const device = args.device;
      if (device && device._disableLearnMode) {
        await device._disableLearnMode();
      } else {
        throw new Error('Device not ready or missing _disableLearnMode method');
      }
    });

    // Register flow card triggers
    this.irCodeLearnedTrigger = this.homey.flow.getDeviceTriggerCard('ir_code_learned');

    this.log('IR Blaster flow cards registered');
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = IrBlasterDriver;

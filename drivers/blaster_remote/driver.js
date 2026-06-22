'use strict';

const { Driver } = require('homey');

class IRRemoteDriver extends Driver {
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
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["blaster_remote_ir_remote_code_learned","blaster_remote_ir_code_received"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit("flow:" + _tid, args);
          });
        }
      } catch (_err) { this.error("Trigger " + _tid + ": " + _err.message); }
    }
    // END TRIGGERS
    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('blaster_remote_ir_remote_send_code');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device._sendIR === 'function') await args.device._sendIR(args.ir_code || args.code);
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action blaster_remote_ir_remote_send_code: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('blaster_remote_ir_remote_start_learning');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device._startLearn === 'function') await args.device._startLearn();
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action blaster_remote_ir_remote_start_learning: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = IRRemoteDriver;


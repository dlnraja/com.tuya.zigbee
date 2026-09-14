'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
const { getRouter } = require('../../lib/ir/IntelligentIRRouter');
const { registerIrWizardHandlers } = require('../../lib/ir/irWizardSession');

class WiFiIrRemoteDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this._router = getRouter(this.homey);
    this._registerFlowCards();
    this.log('[WIFI-IR-REMOTE-DRV] Driver initialized (P2487 flows)');
  }

  _registerFlowCards() {
    const wrap = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (!card) return;
        card.registerRunListener(async (args) => fn(args));
      } catch (e) {
        this.error(`[WIFI-IR] flow ${id}:`, e.message);
      }
    };

    wrap('wifi_ir_remote_start_learn', async (args) => {
      await this._router.learn({
        device: args.device,
        name: args.name || `code_${Date.now()}`,
        timeout: Number(args.duration) || 30,
        confirm: true,
      });
      return true;
    });

    wrap('wifi_ir_remote_send_learned', async (args) => {
      await this._router.send({ device: args.device, learnedName: args.name });
      return true;
    });

    wrap('wifi_ir_remote_send_raw', async (args) => {
      await this._router.send({
        device: args.device,
        code: args.code,
        format: args.format || 'auto',
      });
      return true;
    });
  }

  async onRepair(session, device) {
    registerIrWizardHandlers(session, {
      homey: this.homey,
      device,
      log: (...a) => this.log(...a),
    });
  }
}

module.exports = WiFiIrRemoteDriver;

'use strict';

const Homey = require('homey');
const { getRouter, HOMEY_IR_SENDER_ID } = require('../../lib/ir/IntelligentIRRouter');
const { registerIrWizardHandlers } = require('../../lib/ir/irWizardSession');

/**
 * Virtual IR Remote Driver — P2487 multi-sender (Zigbee / WiFi / Homey Pro 2023 TX).
 */
class IrRemoteDriver extends Homey.Driver {

  async onInit() {
    this.log('Virtual IR Remote Driver initialized (P2487c Homey TX)');
    this._router = getRouter(this.homey);
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const wrap = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (!card) return;
        card.registerRunListener(async (args) => fn(args));
      } catch (e) {
        this.error(`[IR-REMOTE] flow ${id}:`, e.message);
      }
    };

    wrap('ir_remote_send_command', async (args) => {
      const brand = args.device.getSetting('ir_brand');
      const category = args.device.getSetting('ir_category');
      const command = args.command || 'Power';
      // Prefer exact learned name on store, else library key
      const opts = args.device._sendOpts({ learnedName: command });
      if (opts) {
        try {
          await this._router.send(opts);
          return true;
        } catch (_) { /* fall through to library */ }
      }
      return args.device._sendRemoteCommand(brand, category, command);
    });

    wrap('ir_remote_send_custom', async (args) => {
      const brand = args.device.getSetting('ir_brand');
      const category = args.device.getSetting('ir_category');
      return args.device._sendRemoteCommand(brand, category, args.key || 'Power');
    });

    wrap('ir_remote_send_learned', async (args) => {
      const opts = args.device._sendOpts({ learnedName: args.name });
      if (!opts) throw new Error('IR sender not configured');
      await this._router.send(opts);
      return true;
    });

    wrap('ir_remote_send_raw', async (args) => {
      const opts = args.device._sendOpts({
        code: args.code,
        format: args.format || 'auto',
      });
      if (!opts) throw new Error('IR sender not configured');
      await this._router.send(opts);
      return true;
    });

    wrap('ir_remote_start_learn', async (args) => {
      const sender = args.device._resolveSender();
      if (!sender) throw new Error('IR sender not found');
      if (sender.transport === 'homey') {
        throw new Error('Homey onboard IR is TX-only — learn on Zigbee/WiFi');
      }
      await this._router.learn({
        device: sender.device,
        name: args.name || `code_${Date.now()}`,
        timeout: Number(args.timeout_s) || 30,
        confirm: true,
      });
      return true;
    });
  }

  async onPair(session) {
    registerIrWizardHandlers(session, { homey: this.homey, log: (...a) => this.log(...a) });

    session.setHandler('list_devices', async () => {
      const senders = this._router.listSenders();
      // Always offer Homey path as soft option when RF API missing in pair cloud — user can set later
      const list = senders.length ? senders : [{
        id: HOMEY_IR_SENDER_ID,
        driverId: HOMEY_IR_SENDER_ID,
        name: 'Homey onboard IR (set on Pro 2023)',
        transport: 'homey',
      }];
      return list.map((s) => ({
        name: `${s.name} (${s.transport})`,
        data: { id: `virt_${s.driverId}_${s.id}` },
        settings: {
          blaster_id: (s.driverId === 'ir_blaster' || s.driverId === 'blaster_remote') ? s.id : '',
          transport_driver: s.driverId,
          transport_id: s.id,
          ir_brand: 'Samsung',
          ir_category: 'TV',
        },
      }));
    });

    session.setHandler('add_device', async (data) => {
      this.log('Adding virtual remote:', data);
      return data;
    });
  }
}

module.exports = IrRemoteDriver;

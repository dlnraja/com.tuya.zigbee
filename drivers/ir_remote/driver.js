'use strict';

const Homey = require('homey');
const { getRouter } = require('../../lib/ir/IntelligentIRRouter');

/**
 * Virtual IR Remote Driver — P2487 multi-sender pairing (Zigbee + WiFi).
 */
class IrRemoteDriver extends Homey.Driver {

  async onInit() {
    this.log('Virtual IR Remote Driver initialized');
    this._router = getRouter(this.homey);
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      this.homey.flow.getActionCard('ir_remote_send_command')
        .registerRunListener(async (args) => args.device.onCapabilityOnOff(true));
    } catch (e) {
      this.error('ir_remote_send_command:', e.message);
    }

    try {
      this.homey.flow.getActionCard('ir_remote_send_custom')
        .registerRunListener(async (args) => {
          const brand = args.device.getSetting('ir_brand');
          const category = args.device.getSetting('ir_category');
          return args.device._sendRemoteCommand(brand, category, args.key);
        });
    } catch (e) {
      this.error('ir_remote_send_custom:', e.message);
    }
  }

  async onPair(session) {
    const { registerIrWizardHandlers } = require('../../lib/ir/irWizardSession');
    registerIrWizardHandlers(session, { homey: this.homey, log: (...a) => this.log(...a) });

    session.setHandler('list_devices', async () => {
      const senders = this._router.listSenders();
      return senders.map((s) => ({
        name: `${s.name} (${s.transport})`,
        data: { id: `virt_${s.driverId}_${s.id}` },
        settings: {
          blaster_id: s.driverId === 'ir_blaster' ? s.id : '',
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

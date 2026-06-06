'use strict';

const Homey = require('homey');

/**
 * Virtual IR Remote Driver
 * v5.13.0: Manages virtual remote devices and their association with IR Blasters.
 */
class IrRemoteDriver extends Homey.Driver {

  async onInit() {
    this.log('Virtual IR Remote Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    (() => { try { return this.homey.flow.getActionCard('ir_remote_send_command'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
        return args.device.onCapabilityOnOff(true); // Reuses logic for sending command
      });

    (() => { try { return this.homey.flow.getActionCard('ir_remote_send_custom'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
        const brand = args.device.getSetting('ir_brand');
        const category = args.device.getSetting('ir_category');
        return args.device._sendRemoteCommand(brand, category, args.key);
      });
  }

  /**
   * Custom Pairing Logic
   */
  async onPair(session) {
    session.setHandler('list_devices', async () => {
      const blasters = this.homey.drivers.getDriver('ir_blaster').getDevices();
      return blasters.map(d => ({
        name: d.getName(),
        data: { id: d.getData().id },
        settings: { blaster_id: d.getData().id }
      }));
    });

    session.setHandler('add_device', async (data) => {
      this.log('Adding virtual remote:', data);
      return data;
    });
  }

}

module.exports = IrRemoteDriver;

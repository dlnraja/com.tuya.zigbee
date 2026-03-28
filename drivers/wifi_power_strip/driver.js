'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WiFiPowerStripDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    // v5.13.3: Flow card handlers
    try { this.homey.flow.getActionCard('wifi_power_strip_set_socket').registerRunListener(async ({ device, ...args }) => { if (args.socket !== undefined && typeof device.setSocket === 'function') await device.setSocket(args.socket, args.state); return true; }); } catch (e) { this.log('[Flow]', e.message); }
  }
}
module.exports = WiFiPowerStripDriver;

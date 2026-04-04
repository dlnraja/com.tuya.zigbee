'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WiFiLedStripDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    // v5.13.3: Flow card handlers
    try { (() => { try { return this.homey.flow.getActionCard('wifi_led_strip_set_color'); } catch(e) { return null; } })()?.registerRunListener(async ({ device, ...args }) => { if (args.color) await device.triggerCapabilityListener('light_hue', args.color.hue || 0); return true; }); } catch (e) { this.log('[Flow]', e.message); }
  }
}
module.exports = WiFiLedStripDriver;

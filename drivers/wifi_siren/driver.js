'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSirenDriver extends TuyaLocalDriver {
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
    this.log('[WIFI-SIREN-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{(() => { try { return this.homey.flow.getDeviceActionCard(i); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('wifi_siren_activate',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    r('wifi_siren_deactivate',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
  }
}

module.exports = WiFiSirenDriver;

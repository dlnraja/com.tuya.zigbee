'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
const { parseDPValue } = require('../../lib/tuya-local/DPValueParser');

class WiFiGenericDriver extends TuyaLocalDriver {
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
    if (this._wifiGenericFlowCardsRegistered) {return;}
    this._wifiGenericFlowCardsRegistered = true;

    try {
      const setDpCard = this.homey.flow.getActionCard('wifi_generic_set_dp');
      setDpCard.registerRunListener(async (args) => {
        if (!args.device || typeof args.device._setDP !== 'function') {
          throw new Error('No WiFi generic device selected');
        }
        const dp = Number.isFinite(Number(args.dp)) ? Number(args.dp) : String(args.dp || '').trim();
        if (dp === '') {
          throw new Error('DP number is required');
        }
        const value = parseDPValue(args.value, args.type);
        await args.device._setDP(dp, value);
        return true;
      });
    } catch (err) {
      this.log(`[WIFI-GENERIC-DRV] DP action card unavailable: ${err.message}`);
    }

    this.log('[WIFI-GENERIC-DRV] Generic WiFi driver initialized');
  }
}
module.exports = WiFiGenericDriver;

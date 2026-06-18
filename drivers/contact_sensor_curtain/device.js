'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class ContactSensorCurtainDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Contact Sensor Curtain v5.9.12 Ready');
  }

  async _safeSetCapability(capability, value) {
    try {
      return await this.safeSetCapabilityValue(capability, value);
    } catch (err) {
      this.error(`[SAFE-SET] ${capability}=${value} failed:`, err.message);
      return null;
    }
  }

  async _handleButtonPress(value) {
    if (this._destroyed) return;
    this.log(`[CONTACT] Button pressed: ${value}`);
    try {
      await this._safeSetCapability('button', true).catch(() => { });
      this.homey.setTimeout(() => {
        if (this._destroyed) return;
        this._safeSetCapability('button', false).catch(() => { });
      }, 500);

      const triggerCard = (() => {
        try { return this.homey.flow.getDeviceTriggerCard('contact_button_pressed'); }
        catch (e) { return null; }
      })();
      
      if (triggerCard) {
        await triggerCard.trigger(this, { button: 1, scene: 'pressed' }).catch(() => { });
      }
    } catch (err) {
      this.log('[CONTACT] Button trigger error:', err.message);
    }
  }
}

module.exports = ContactSensorCurtainDevice;

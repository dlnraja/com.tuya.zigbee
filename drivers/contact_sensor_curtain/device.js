'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class ContactSensorCurtainDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Contact Sensor Curtain v5.9.12 Ready');
  }

  async _handleButtonPress(value) {
    this.log(`[CONTACT] Button pressed: ${value}`);
    try {
      await this.setCapabilityValue('button', true).catch(() => { });
      setTimeout(() => {
        this.setCapabilityValue('button', false).catch(() => { });
      }, 500);

      const triggerCard = (() => {
        try { return this.homey.flow.getTriggerCard('contact_button_pressed'); }
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

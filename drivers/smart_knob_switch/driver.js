'use strict';

const {Driver}=require('homey');

class SmartKnobSwitchDriver extends Driver{
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

  async onInit(){this.log('smart_knob_switch driver init');}
}

module.exports=SmartKnobSwitchDriver;

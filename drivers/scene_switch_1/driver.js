'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch1Driver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('SceneSwitch1Driver initialized');

    // Register flow triggers





    this.log('SceneSwitch1Driver flow triggers registered');
  
  
  
  }

  triggerButtonPressed(device) {
    return this._buttonPressedTrigger.trigger(device, {}).catch(this.error);
  }

  triggerButtonDoublePressed(device) {
    return this._buttonDoubleTrigger.trigger(device, {}).catch(this.error);
  }

  triggerButtonLongPressed(device) {
    return this._buttonLongTrigger.trigger(device, {}).catch(this.error);
  }

  triggerBatteryChanged(device, tokens) {
    return this._batteryChangedTrigger.trigger(device, tokens).catch(this.error);
  }

}

module.exports = SceneSwitch1Driver;


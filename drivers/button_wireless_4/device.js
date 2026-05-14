'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Button 4 Gang - Universal Driver (v9.5.0)
 * Rebuilt using PhysicalButtonMixin for robust 8-layer detection.
 * Supports TS0044, TS004F, MOES E000, and Tuya DP variants.
 */
class Button4GangDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    
    // Initialize base systems (Mixins automatically hook in via super)
    await super.onNodeInit({ zclNode });

    this.log('[BUTTON4] 🔘 Initialized via Universal Mixin System');
    this.log('[BUTTON4] 📡 8-Layer Detection Active: Scenes, OnOff, Multi, Level, E000, DP, Raw');
  }

}

module.exports = Button4GangDevice;

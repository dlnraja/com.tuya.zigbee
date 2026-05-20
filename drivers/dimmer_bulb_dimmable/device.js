'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');


const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * 
 *       DIMMABLE BULB - v5.5.992 + Virtual Buttons                             
 * 
 *   UnifiedLightBase handles: onoff, dim listeners completely                   
 *   v5.5.992: Added virtual toggle/dim up/down buttons                         
 *   DPs: 1=switch, 2=brightness, 3=min brightness, 4=countdown, 21=power-on    
 *   ZCL: 0x0006 On/Off, 0x0008 Level Control                                   
 *   Models: TS0501B, TS0502B, _TZ3210_*, _TZ3000_*                              
 * 
 */
class DimmableBulbDevice extends VirtualButtonMixin(UnifiedLightBase) {

  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', transform: (v) => Math.max(0.01, v * 1000) },
      3: { internal: true, type: 'min_brightness', writable: true },
      4: { internal: true, type: 'countdown', writable: true },
      21: { internal: true, type: 'power_on_behavior', writable: true },
      101: { capability: 'dim', divisor: 100 }
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // Parent handles EVERYTHING: ZCL setup, capability listeners
    await super.onNodeInit({ zclNode });
    // v5.5.992: Initialize virtual buttons
    await this.initVirtualButtons();
    this.log('[DIM-BULB] v5.5.992  Ready + virtual buttons');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = DimmableBulbDevice;

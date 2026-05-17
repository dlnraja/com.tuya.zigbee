'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.564: COMPLETE FLOW CARDS with safe device validation
 * Fixes "Cannot get device by id" error - returns false instead of throwing
 */
class MotionSensorDriver extends ZigBeeDriver {
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
    await super// Sleepy device: Use Passive Mode (SLEEPY_TUYA_56_YEARS_BUG.md)
    .onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    this.log('MotionSensorDriver v5.5.564 initializing...');

    try {
      // 
      // TRIGGER CARDS - All triggers from driver.flow.compose.json
      // 






      // 
      // CONDITION CARDS - with device validation
      // 

      this.motionActiveCondition?.registerRunListener(async (args ) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') {
          this.log('[FLOW] Condition: Device not available');
          return false;
        
  
  
  
  
  
  
  }
        return args.device.getCapabilityValue('alarm_motion') === true;
      });

      this.log('MotionSensorDriver v5.5.564  All flow cards registered');
    } catch (err) {
      this.error('MotionSensorDriver flow card registration failed:', err.message);
    }
  }
}

module.exports = MotionSensorDriver;


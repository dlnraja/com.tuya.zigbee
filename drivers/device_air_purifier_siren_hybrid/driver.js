'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.569: CRITICAL FIX - Flow card run listeners were missing
 * Same issue as smoke_detector_advanced - cards defined but not registered
 */
class TuyaSirenDriver extends ZigBeeDriver {
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

    this.log('TuyaSirenDriver v5.11.28 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  /**
   * v5.5.569: Register flow card run listeners
   */
  _registerFlowCards() {
    // 
    // CONDITION: Siren is/is not sounding
    // 
    try {
      const sirenCondition =

      sirenCondition.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Condition: Device not available');
          return false;
        }
        const isOn = device.getCapabilityValue('onoff') || device.getCapabilityValue('alarm_generic');
        this.log(`[FLOW] Condition siren_is_sounding: ${isOn}`);
        return isOn === true;
      });
      this.log('[FLOW]  Registered: siren_is_sounding');
    } catch (err) {
      this.log(`[FLOW]  Could not register siren_is_sounding: ${err.message}`);
    }

    // 
    // ACTION: Turn on siren
    // 
    try {
      const turnOnAction =

      turnOnAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        this.log('[FLOW] Action: Turning siren ON');
        try {
          if (device.hasCapability('onoff')) {
            await device.setCapabilityValue('onoff', true);
          }
          if (device.hasCapability('alarm_generic')) {
            await device.setCapabilityValue('alarm_generic', true);
          }
          return true;
        } catch (err) {
          this.log(`[FLOW]  Turn on failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW]  Registered: siren_turn_on');
    } catch (err) {
      this.log(`[FLOW]  Could not register siren_turn_on: ${err.message}`);
    }

    // 
    // ACTION: Turn off siren
    // 
    try {
      const turnOffAction =

      turnOffAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        this.log('[FLOW] Action: Turning siren OFF');
        try {
          if (device.hasCapability('onoff')) {
            await device.setCapabilityValue('onoff', false);
          }
          if (device.hasCapability('alarm_generic')) {
            await device.setCapabilityValue('alarm_generic', false);
          }
          return true;
        } catch (err) {
          this.log(`[FLOW]  Turn off failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW]  Registered: siren_turn_off');
    } catch (err) {
      this.log(`[FLOW]  Could not register siren_turn_off: ${err.message}`);
    }

    // 
    // ACTION: Set volume
    // 
    try {
      const setVolumeAction =

      setVolumeAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        const volume = args.volume || 'medium';
        this.log(`[FLOW] Action: Set volume to ${volume}`);
        try {
          const volumeMap = { low: 0, medium: 1, high: 2 };
          const val = volumeMap[volume] ?? 1;
          // Send to standard DP5 + NEO DP116
          if (device._sendTuyaDP) {
            try { await device._sendTuyaDP(5, val, 'enum' ); } catch (e) {}
            try { await device._sendTuyaDP(116, val, 'enum'); } catch (e) {}
          }
          return true;
        } catch (err) {
          this.log(`[FLOW]  Set volume failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW]  Registered: siren_set_volume');
    } catch (err) {
      this.log(`[FLOW]  Could not register siren_set_volume: ${err.message}`);
    }

    // 
    // ACTION: Set duration
    // 
    try {
      const setDurationAction =

      setDurationAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        const duration = args.duration || 30;
        this.log(`[FLOW] Action: Set duration to ${duration}s`);
        try {
          // Send to standard DP7 + NEO DP103
          if (device._sendTuyaDP) {
            try { await device._sendTuyaDP(7, duration, 'value'); } catch (e) {}
            try { await device._sendTuyaDP(103, duration, 'value'); } catch (e) {}
          }
          return true;
        } catch (err) {
          this.log(`[FLOW]  Set duration failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW]  Registered: siren_set_duration');
    } catch (err) {
      this.log(`[FLOW]  Could not register siren_set_duration: ${err.message}`);
    }

    // 
    // ACTION: Set melody
    // 
    try {
      const setMelodyAction =

      setMelodyAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) return false;
        const melody = parseInt(args.melody , 10) || 0;
        this.log(`[FLOW] Action: Set melody to ${melody}`);
        try {
          // Send to standard DP21 + NEO DP102
          if (device._sendTuyaDP) {
            try { await device._sendTuyaDP(21, melody, 'enum'); } catch (e) {}
            try { await device._sendTuyaDP(102, melody, 'enum'); } catch (e) {}
          }
          return true;
        } catch (err) {
          this.log(`[FLOW]  Set melody failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW]  Registered: siren_set_melody');
    } catch (err) {
      this.log(`[FLOW]  Could not register siren_set_melody: ${err.message}`);
    }

    this.log('[FLOW]  All siren flow cards registered');
  }
}

module.exports = TuyaSirenDriver;


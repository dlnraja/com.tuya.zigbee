'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.569: CRITICAL FIX - Flow card run listeners were missing
 * Same issue as smoke_detector_advanced - cards defined but not registered
 */
class TuyaSirenDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaSirenDriver v5.5.569 initialized');
    this._registerFlowCards();
  }

  /**
   * v5.5.569: Register flow card run listeners
   */
  _registerFlowCards() {
    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION: Siren is/is not sounding
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const sirenCondition = this.homey.flow.getConditionCard('siren_is_sounding');
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
      this.log('[FLOW] ✅ Registered: siren_is_sounding');
    } catch (err) {
      this.log(`[FLOW] ⚠️ Could not register siren_is_sounding: ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Turn on siren
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const turnOnAction = this.homey.flow.getActionCard('siren_turn_on');
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
          this.log(`[FLOW] ⚠️ Turn on failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW] ✅ Registered: siren_turn_on');
    } catch (err) {
      this.log(`[FLOW] ⚠️ Could not register siren_turn_on: ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Turn off siren
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const turnOffAction = this.homey.flow.getActionCard('siren_turn_off');
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
          this.log(`[FLOW] ⚠️ Turn off failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW] ✅ Registered: siren_turn_off');
    } catch (err) {
      this.log(`[FLOW] ⚠️ Could not register siren_turn_off: ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Set volume
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const setVolumeAction = this.homey.flow.getActionCard('siren_set_volume');
      setVolumeAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        const volume = args.volume || 'medium';
        this.log(`[FLOW] Action: Set volume to ${volume}`);
        try {
          if (device._tuyaEF00Manager) {
            const volumeMap = { low: 0, medium: 1, high: 2 };
            await device._tuyaEF00Manager.sendDatapoint(5, volumeMap[volume] || 1, 'enum');
          }
          return true;
        } catch (err) {
          this.log(`[FLOW] ⚠️ Set volume failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW] ✅ Registered: siren_set_volume');
    } catch (err) {
      this.log(`[FLOW] ⚠️ Could not register siren_set_volume: ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Set duration
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const setDurationAction = this.homey.flow.getActionCard('siren_set_duration');
      setDurationAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        const duration = args.duration || 30;
        this.log(`[FLOW] Action: Set duration to ${duration}s`);
        try {
          if (device._tuyaEF00Manager) {
            await device._tuyaEF00Manager.sendDatapoint(7, duration, 'value');
          }
          return true;
        } catch (err) {
          this.log(`[FLOW] ⚠️ Set duration failed: ${err.message}`);
          return true;
        }
      });
      this.log('[FLOW] ✅ Registered: siren_set_duration');
    } catch (err) {
      this.log(`[FLOW] ⚠️ Could not register siren_set_duration: ${err.message}`);
    }

    this.log('[FLOW] 🎉 All siren flow cards registered');
  }
}

module.exports = TuyaSirenDriver;

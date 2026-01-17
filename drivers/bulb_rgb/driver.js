'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RGB BULB DRIVER - v5.5.574 (TS0505B Full Features)                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.5.574: CRITICAL FIX - Added missing flow card run listeners             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartBulbRgbDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SmartBulbRgbDriver v5.5.574 initialized');

    // Register all flow cards
    this._registerFlowCards();

    // Register flow card: Set Light Effect
    this._registerSetLightEffectAction();

    // Register flow card: Set Color Temperature in Kelvin
    this._registerSetColorTempKelvinAction();

    this.log('[RGB-DRIVER] ✅ Flow cards registered');
  }

  _registerFlowCards() {
    // CONDITION: Is on/off
    try {
      this.homey.flow.getConditionCard('bulb_rgb_smart_bulb_rgb_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ bulb_rgb_smart_bulb_rgb_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('bulb_rgb_smart_bulb_rgb_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ bulb_rgb_smart_bulb_rgb_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('bulb_rgb_smart_bulb_rgb_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ bulb_rgb_smart_bulb_rgb_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('bulb_rgb_smart_bulb_rgb_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ bulb_rgb_smart_bulb_rgb_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness
    try {
      this.homey.flow.getActionCard('bulb_rgb_smart_bulb_rgb_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ bulb_rgb_smart_bulb_rgb_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
  }

  _registerSetLightEffectAction() {
    // v5.5.556: Flow card disabled - not defined in app.json
    // To re-enable: add set_light_effect to .homeycompose/flow/actions/
    this.log('[RGB-DRIVER] set_light_effect flow card skipped (not defined)');
  }

  _registerSetColorTempKelvinAction() {
    try {
      const action = this.homey.flow.getActionCard('set_color_temp_kelvin');
      if (!action) return;

      action.registerRunListener(async (args) => {
        const { device, kelvin } = args;
        if (!device || typeof device.setColorTemperatureKelvin !== 'function') {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        if (!kelvin) {
          this.log('[FLOW] Action: Kelvin value required');
          return false;
        }

        this.log(`[RGB-DRIVER] Setting color temp: ${kelvin}K on ${device.getName()}`);
        await device.setColorTemperatureKelvin(kelvin);
        return true;
      });
    } catch (err) {
      // Flow card not defined - skip silently
      this.log('[RGB-DRIVER] set_color_temp_kelvin flow card not available');
    }
  }
}

module.exports = SmartBulbRgbDriver;

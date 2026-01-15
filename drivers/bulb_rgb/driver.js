'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RGB BULB DRIVER - v5.5.238 (TS0505B Full Features)                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Flow Cards: set_light_effect, set_color_temp_kelvin                         ║
 * ║  Features: Effects, Color Loop, Power On Behavior, Do Not Disturb           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartBulbRgbDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SmartBulbRgbDriver v5.5.531 initialized');

    // Register flow card: Set Light Effect
    this._registerSetLightEffectAction();

    // Register flow card: Set Color Temperature in Kelvin
    this._registerSetColorTempKelvinAction();

    this.log('[RGB-DRIVER] ✅ Flow cards registered');
  }

  _registerSetLightEffectAction() {
    try {
      const action = this.homey.flow.getActionCard('set_light_effect');
      if (!action) return;

      action.registerRunListener(async (args) => {
        const { device, effect } = args;
        if (!device || !effect) throw new Error('Device and effect required');

        this.log(`[RGB-DRIVER] Setting effect: ${effect} on ${device.getName()}`);
        await device.setLightEffect(effect);
        return true;
      });
    } catch (err) {
      // Flow card not defined - skip silently
      this.log('[RGB-DRIVER] set_light_effect flow card not available');
    }
  }

  _registerSetColorTempKelvinAction() {
    try {
      const action = this.homey.flow.getActionCard('set_color_temp_kelvin');
      if (!action) return;

      action.registerRunListener(async (args) => {
        const { device, kelvin } = args;
        if (!device || !kelvin) throw new Error('Device and kelvin required');

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

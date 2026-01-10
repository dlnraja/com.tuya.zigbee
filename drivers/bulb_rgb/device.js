'use strict';

const { HybridLightBase } = require('../../lib/devices/HybridLightBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RGB BULB - v5.5.238 FULL FEATURES (TS0505B Complete)                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridLightBase handles: onoff, dim, light_temperature, protocol learning  ║
 * ║  This class EXTENDS with: light_hue, light_saturation, HSV parsing          ║
 * ║                                                                              ║
 * ║  TUYA DPs (from Zigbee2MQTT TS0505B):                                       ║
 * ║  DP1  = switch (bool)           DP2  = mode (0=white, 1=color, 2=scene)     ║
 * ║  DP3  = brightness (0-1000)     DP4  = color_temp (0-1000)                  ║
 * ║  DP5  = HSV color (12 hex)      DP6  = scene_data (string)                  ║
 * ║  DP7  = countdown (seconds)     DP8  = music_sync (bool)                    ║
 * ║  DP21 = power_on_behavior       DP26 = do_not_disturb (bool)                ║
 * ║                                                                              ║
 * ║  ZCL Clusters: 0x0006 On/Off, 0x0008 Level, 0x0300 Color, 0xEF00 Tuya       ║
 * ║  Models: TS0505B, TS0504B, TS0503A, _TZ3210_*, _TZ3000_*                     ║
 * ║                                                                              ║
 * ║  NEW v5.5.238 FEATURES:                                                      ║
 * ║  - Light effects (breath, color_loop, blink, candle, fireplace, etc.)       ║
 * ║  - Color temperature in Kelvin (2000K-6500K)                                 ║
 * ║  - Power on behavior setting (off, on, previous)                             ║
 * ║  - Do not disturb mode                                                       ║
 * ║  - Transition time setting                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Effect scene data mappings (Tuya DP6 format)
const LIGHT_EFFECTS = {
  steady: '000e0d00002e03e803e8',           // Steady white
  breath: '010e0d00002e03e803e8',           // Breathing effect
  color_loop: '020e0d0000000000036003e803e8036003e803e8', // Color loop
  blink: '030e0d00002e03e803e8',            // Blink effect
  candle: '040e0d00002e03e803e8',           // Candle flicker
  fireplace: '050e0d000096000003e803e800c800fa03e8', // Fireplace
  colorful: '060e0d0000000000036003e803e8036003e803e8', // Colorful
  rainbow: '070e0d00000000000b4003e803e80b4003e803e8', // Rainbow
  aurora: '080e0d00002e03e803e8',           // Aurora borealis
  party: '060e0d0000000000000003e803e80b4003e803e8', // Party mode
};

class RGBBulbDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'];
  }

  get dpMappings() {
    return {
      // Core controls
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'light_mode', transform: (v) => this._parseLightMode(v) }, // 0=white, 1=color, 2=scene
      3: { capability: 'dim', transform: (v) => Math.max(0.01, v / 1000) },
      4: { capability: 'light_temperature', transform: (v) => v / 1000 }, // 0-1000 → 0-1
      5: { capability: null, internal: 'hsv', transform: (v) => this._parseHSV(v) },

      // Extended features
      6: { capability: null, internal: 'scene_data' },
      7: { capability: null, internal: 'countdown', writable: true },
      8: { capability: null, internal: 'music_sync' }, // Music sync mode

      // Settings
      21: { capability: null, setting: 'power_on_behavior' }, // off, on, previous
      26: { capability: null, setting: 'do_not_disturb' }, // Keep off after power loss

      // Alternative DPs (some devices use different mappings)
      24: { capability: null, internal: 'hsv_alt', transform: (v) => this._parseHSV(v) },
      25: { capability: 'dim', transform: (v) => Math.max(0.01, v / 1000) },
      101: { capability: 'dim', divisor: 100 }
    };
  }

  _parseLightMode(v) {
    // 0=white, 1=color, 2=scene/music
    const modes = { 0: 'temperature', 1: 'color', 2: 'color' };
    return modes[v] || 'color';
  }

  async onNodeInit({ zclNode }) {
    try {
      // v5.5.288: Enhanced error handling for TS0505B "Could not get device by id" issue
      this.log('[RGB] v5.5.288 - Starting initialization...');
      this.log(`[RGB] Device ID: ${this.getData()?.id || 'unknown'}`);
      this.log(`[RGB] ManufacturerName: ${this.getData()?.manufacturerName || 'unknown'}`);

      // Let parent initialize first (handles onoff, dim listeners)
      await super.onNodeInit({ zclNode });

      this.log('[RGB] DPs: 1-7,21,24-26,101 | ZCL: 6,8,300,EF00');

      // Add ZCL color listeners (parent doesn't handle hue/sat)
      await this._setupColorCluster(zclNode);

      // Add ONLY hue/saturation listeners (parent handles onoff, dim)
      this._setupHueListeners();

      // v5.5.288: Verify device is properly initialized
      if (!this.zclNode) {
        this.error('[RGB] ⚠️ zclNode not set after parent init - device may not work properly');
      }

      this.log('[RGB] ✅ RGB bulb ready');
    } catch (err) {
      this.error(`[RGB] ❌ Initialization failed: ${err.message}`);
      this.error('[RGB] ❌ Stack:', err.stack);
      // Don't throw - let device be available but log the error
    }
  }

  _parseHSV(raw) {
    if (!raw || typeof raw !== 'string' || raw.length < 12) return null;
    try {
      const h = parseInt(raw.substring(0, 4), 16);
      const s = parseInt(raw.substring(4, 8), 16);
      const v = parseInt(raw.substring(8, 12), 16);
      this.setCapabilityValue('light_hue', h / 360).catch(() => { });
      this.setCapabilityValue('light_saturation', s / 1000).catch(() => { });
      this.setCapabilityValue('dim', Math.max(0.01, v / 1000)).catch(() => { });
      return { h, s, v };
    } catch (e) { return null; }
  }

  async _setupColorCluster(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;
    try {
      const colorCluster = ep1.clusters?.lightingColorCtrl || ep1.clusters?.colorControl;
      if (colorCluster?.on) {
        colorCluster.on('attr.currentHue', (v) => this.setCapabilityValue('light_hue', v / 254).catch(() => { }));
        colorCluster.on('attr.currentSaturation', (v) => this.setCapabilityValue('light_saturation', v / 254).catch(() => { }));
        this.log('[RGB] ✅ Color cluster listeners added');
      }
    } catch (e) { /* ignore */ }
  }

  _setupHueListeners() {
    // ONLY register hue/saturation (parent handles onoff, dim)
    if (this.hasCapability('light_hue')) {
      this.registerCapabilityListener('light_hue', async () => await this._sendHSV());
    }
    if (this.hasCapability('light_saturation')) {
      this.registerCapabilityListener('light_saturation', async () => await this._sendHSV());
    }
  }

  async _sendHSV() {
    const h = Math.round((this.getCapabilityValue('light_hue') || 0) * 360);
    const s = Math.round((this.getCapabilityValue('light_saturation') || 1) * 1000);
    const v = Math.round((this.getCapabilityValue('dim') || 1) * 1000);
    const hsv = h.toString(16).padStart(4, '0') + s.toString(16).padStart(4, '0') + v.toString(16).padStart(4, '0');
    await this._sendTuyaDP(5, hsv, 'raw');
    await this._sendTuyaDP(2, 1, 'enum'); // Switch to color mode
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) await tuya.datapoint({ dp, value, type });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.238: NEW FEATURES - Light Effects, Color Temp Kelvin, Settings
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set a predefined light effect
   * @param {string} effectName - Effect name (steady, breath, color_loop, etc.)
   */
  async setLightEffect(effectName) {
    const sceneData = LIGHT_EFFECTS[effectName];
    if (!sceneData) {
      this.log(`[RGB] ⚠️ Unknown effect: ${effectName}`);
      return;
    }

    this.log(`[RGB] 🎨 Setting effect: ${effectName}`);

    // First, switch to scene mode (mode = 2)
    await this._sendTuyaDP(2, 2, 'enum');

    // Then send scene data to DP6
    await this._sendTuyaDP(6, sceneData, 'raw');

    // Turn on if not already
    await this.setCapabilityValue('onoff', true).catch(() => { });
  }

  /**
   * Set color temperature in Kelvin
   * @param {number} kelvin - Color temperature (2000-6500K)
   */
  async setColorTemperatureKelvin(kelvin) {
    // Clamp to valid range
    kelvin = Math.max(2000, Math.min(6500, kelvin));

    // Convert Kelvin to Tuya value (0-1000 scale, inverted)
    // 6500K = 0 (cold), 2000K = 1000 (warm)
    const tuyaValue = Math.round(((6500 - kelvin) / 4500) * 1000);

    // Also convert to Homey light_temperature (0 = warm, 1 = cold)
    const homeyValue = (kelvin - 2000) / 4500;

    this.log(`[RGB] 🌡️ Setting color temp: ${kelvin}K (Tuya: ${tuyaValue}, Homey: ${homeyValue.toFixed(2)})`);

    // Switch to white mode first
    await this._sendTuyaDP(2, 0, 'enum');

    // Send color temperature to DP4
    await this._sendTuyaDP(4, tuyaValue, 'value');

    // Update Homey capability
    await this.setCapabilityValue('light_temperature', parseFloat(homeyValue)).catch(() => { });
    await this.setCapabilityValue('light_mode', 'temperature').catch(() => { });
  }

  /**
   * Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`[RGB] ⚙️ Settings changed: ${changedKeys.join(', ')}`);

    for (const key of changedKeys) {
      switch (key) {
        case 'power_on_behavior':
          await this._setPowerOnBehavior(newSettings.power_on_behavior);
          break;
        case 'do_not_disturb':
          await this._setDoNotDisturb(newSettings.do_not_disturb);
          break;
        case 'transition_time':
          this._transitionTime = newSettings.transition_time;
          break;
      }
    }
  }

  /**
   * Set power on behavior (DP21)
   * @param {string} behavior - 'off', 'on', or 'previous'
   */
  async _setPowerOnBehavior(behavior) {
    const values = { off: 0, on: 1, previous: 2 };
    const value = values[behavior] ?? 2;
    this.log(`[RGB] ⚡ Setting power_on_behavior: ${behavior} (${value})`);
    await this._sendTuyaDP(21, value, 'enum');
  }

  /**
   * Set do not disturb mode (DP26)
   * @param {boolean} enabled - Enable DND mode
   */
  async _setDoNotDisturb(enabled) {
    this.log(`[RGB] 🔕 Setting do_not_disturb: ${enabled}`);
    await this._sendTuyaDP(26, enabled ? 1 : 0, 'bool');
  }

  /**
   * Get transition time from settings
   */
  get transitionTime() {
    return this._transitionTime ?? this.getSetting('transition_time') ?? 0.4;
  }
}

module.exports = RGBBulbDevice;

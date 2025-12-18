'use strict';

const { HybridLightBase } = require('../../lib/devices/HybridLightBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RGBW/RGBCCT BULB - v5.5.129 FIXED (extends HybridLightBase properly)   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridLightBase handles: onoff, dim, light_temperature listeners           ║
 * ║  This class EXTENDS with: light_hue, light_saturation, light_mode, HSV      ║
 * ║  DPs: 1=switch, 2=mode, 3=brightness, 4=color temp, 5=HSV                   ║
 * ║  ZCL: 0x0006 On/Off, 0x0008 Level, 0x0300 Color Control                     ║
 * ║  Models: TS0505B, TS0504B, _TZ3210_*, _TZ3000_*                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class RGBWBulbDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'light_mode', transform: (v) => v === 0 ? 'temperature' : 'color' },
      3: { capability: 'dim', transform: (v) => Math.max(0.01, v / 1000) },
      4: { capability: 'light_temperature', transform: (v) => 1 - (v / 1000) },
      5: { capability: null, internal: 'hsv', transform: (v) => this._parseHSV(v) },
      6: { capability: null, internal: 'scene_data' },
      7: { capability: null, internal: 'countdown', writable: true },
      21: { capability: null, internal: 'power_on_behavior', writable: true },
      24: { capability: null, internal: 'hsv_alt', transform: (v) => this._parseHSV(v) },
      25: { capability: 'dim', transform: (v) => Math.max(0.01, v / 1000) },
      26: { capability: 'light_temperature', transform: (v) => 1 - (v / 1000) }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[RGBW] v5.5.129 - DPs: 1-7,21,24-26 | ZCL: 6,8,300,EF00');
    await this._setupColorCluster(zclNode);
    this._setupRGBWListeners();
    this.log('[RGBW] ✅ RGBW bulb ready');
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
        this.log('[RGBW] ✅ Color cluster listeners added');
      }
    } catch (e) { /* ignore */ }
  }

  _setupRGBWListeners() {
    // ONLY register hue/saturation/mode (parent handles onoff, dim, light_temperature)
    if (this.hasCapability('light_hue')) {
      this.registerCapabilityListener('light_hue', async () => await this._sendHSV());
    }
    if (this.hasCapability('light_saturation')) {
      this.registerCapabilityListener('light_saturation', async () => await this._sendHSV());
    }
    if (this.hasCapability('light_mode')) {
      this.registerCapabilityListener('light_mode', async (v) => {
        await this._sendTuyaDP(2, v === 'color' ? 1 : 0, 'enum');
      });
    }
  }

  async _sendHSV() {
    const h = Math.round((this.getCapabilityValue('light_hue') || 0) * 360);
    const s = Math.round((this.getCapabilityValue('light_saturation') || 1) * 1000);
    const v = Math.round((this.getCapabilityValue('dim') || 1) * 1000);
    const hsv = h.toString(16).padStart(4, '0') + s.toString(16).padStart(4, '0') + v.toString(16).padStart(4, '0');
    await this._sendTuyaDP(5, hsv, 'raw');
    await this._sendTuyaDP(2, 1, 'enum');
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) await tuya.datapoint({ dp, value, type });
  }
}

module.exports = RGBWBulbDevice;

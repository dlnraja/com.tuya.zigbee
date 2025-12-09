'use strict';

const { HybridLightBase } = require('../../lib/devices');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RGB BULB - v5.5.130 ENRICHED (Zigbee2MQTT features)                    ║
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
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
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
    // Let parent initialize first (handles onoff, dim listeners)
    await super.onNodeInit({ zclNode });

    this.log('[RGB] v5.5.129 - DPs: 1-7,21,24-26,101 | ZCL: 6,8,300,EF00');

    // Add ZCL color listeners (parent doesn't handle hue/sat)
    await this._setupColorCluster(zclNode);

    // Add ONLY hue/saturation listeners (parent handles onoff, dim)
    this._setupHueListeners();

    this.log('[RGB] ✅ RGB bulb ready');
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
}

module.exports = RGBBulbDevice;

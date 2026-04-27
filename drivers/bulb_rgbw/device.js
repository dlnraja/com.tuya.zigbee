'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

class RGBWBulbDevice extends UnifiedLightBase {
  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'];
  }
  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'light_mode', transform: (v) => v === 0 ? 'temperature' : 'color' },
      3: { capability: 'dim', transform: (v) => safeDivide(v, 1000) },
      4: { capability: 'light_temperature', transform: (v) => 1 - safeDivide(v, 1000) },
      5: { internal: true, type: 'hsv', transform: (v) => this._parseHSV(v) },
      6: { internal: true, type: 'scene_data' },
      7: { internal: true, type: 'countdown', writable: true },
      21: { internal: true, type: 'power_on_behavior', writable: true },
      24: { internal: true, type: 'hsv_alt', transform: (v) => this._parseHSV(v) },
      25: { capability: 'dim', transform: (v) => safeDivide(v, 1000) },
      26: { capability: 'light_temperature', transform: (v) => 1 - safeDivide(v, 1000) }
    };
  }
  async onNodeInit({ zclNode }) {
    this.log('[RGBW] Initialization...');
    await this._setupColorCluster(zclNode);
    this._setupRGBWListeners();
    this.log('[RGBW] RGBW bulb ready');
  }
  _parseHSV(raw) {
    if (!raw || typeof raw !== 'string' || raw.length < 12) return null;
    try {
      const h = parseInt(raw.substring(0, 4), 16);
      const s = parseInt(raw.substring(4, 8), 16);
      const v = parseInt(raw.substring(8, 12), 16);
      this.setCapabilityValue('light_hue', safeDivide(h, 360)).catch(() => { });
      this.setCapabilityValue('light_saturation', safeDivide(s, 1000)).catch(() => { });
      this.setCapabilityValue('dim', Math.max(0.01, safeDivide(v, 1000))).catch(() => { });
      return { h, s, v };
    } catch (e) { return null; }
  }
  async _setupColorCluster(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;
    const color = ep1.clusters?.lightingColorCtrl || ep1.clusters?.colorControl;
    if (color?.on) {
      color.on('attr.currentHue', (v) => this.setCapabilityValue('light_hue', safeDivide(v, 254)).catch(() => { }));
      color.on('attr.currentSaturation', (v) => this.setCapabilityValue('light_saturation', safeDivide(v, 254)).catch(() => { }));
    }
  }
  _setupRGBWListeners() {
    if (this.hasCapability('light_hue')) this.registerCapabilityListener('light_hue', async () => await this._sendHSV());
    if (this.hasCapability('light_saturation')) this.registerCapabilityListener('light_saturation', async () => await this._sendHSV());
    if (this.hasCapability('light_mode')) {
      this.registerCapabilityListener('light_mode', async (v) => {
        await this._sendTuyaDP(2, v === 'color' ? 1 : 0, 'enum');
      });
    }
  }
  async _sendHSV() {
    const h = Math.round(safeMultiply(this.getCapabilityValue('light_hue') || 0, 360));
    const s = Math.round(safeMultiply(this.getCapabilityValue('light_saturation') || 1, 1000));
    const v = Math.round(safeMultiply(this.getCapabilityValue('dim') || 1, 1000));
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

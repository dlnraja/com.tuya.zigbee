'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

const LIGHT_EFFECTS = {
  steady: '000e0d00002e03e803e8',
  breath: '010e0d00002e03e803e8',
  color_loop: '020e0d0000000000036003e803e8036003e803e8',
  blink: '030e0d00002e03e803e8',
  candle: '040e0d00002e03e803e8',
  fireplace: '050e0d000096000003e803e800c800fa03e8',
  colorful: '060e0d0000000000036003e803e8036003e803e8',
  rainbow: '070e0d00000000000b4003e803e80b4003e803e8',
  aurora: '080e0d00002e03e803e8',
  party: '060e0d0000000000000003e803e80b4003e803e8',
};

class RGBBulbDevice extends UnifiedLightBase {
  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'];
  }
  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'light_mode', transform: (v) => this._parseLightMode(v) },
      3: { capability: 'dim', transform: (v) => safeDivide(v, 1000) },
      4: { capability: 'light_temperature', transform: (v) => safeDivide(v, 1000) },
      5: { internal: true, type: 'hsv', transform: (v) => this._parseHSV(v) },
      6: { internal: true, type: 'scene_data' },
      7: { internal: true, type: 'countdown', writable: true },
      8: { internal: true, type: 'music_sync' },
      21: { setting: 'power_on_behavior' },
      26: { setting: 'do_not_disturb' },
      24: { internal: true, type: 'hsv_alt', transform: (v) => this._parseHSV(v) },
      25: { capability: 'dim', transform: (v) => safeDivide(v, 1000) },
      101: { capability: 'dim', divisor: 100 }
    };
  }
  _parseLightMode(v) {
    const modes = { 0: 'temperature', 1: 'color', 2: 'color' };
    return modes[v] || 'color';
  }
  async onNodeInit({ zclNode }) {
    try {
      this.log('[RGB] Initialization...');
      await this._setupColorCluster(zclNode);
      this._setupHueListeners();
      this.log('[RGB] RGB bulb ready');
    } catch (err) {
      this.error(`[RGB] Initialization failed: ${err.message}`);
    }
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
  _setupHueListeners() {
    if (this.hasCapability('light_hue')) this.registerCapabilityListener('light_hue', async () => await this._sendHSV());
    if (this.hasCapability('light_saturation')) this.registerCapabilityListener('light_saturation', async () => await this._sendHSV());
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
  async setLightEffect(effectName) {
    const sceneData = LIGHT_EFFECTS[effectName];
    if (!sceneData) return;
    await this._sendTuyaDP(2, 2, 'enum');
    await this._sendTuyaDP(6, sceneData, 'raw');
    await this.setCapabilityValue('onoff', true).catch(() => { });
  }
  async setColorTemperatureKelvin(kelvin) {
    kelvin = Math.max(2000, Math.min(6500, kelvin));
    const tuyaValue = Math.round(safeMultiply(safeDivide(6500 - kelvin, 4500), 1000));
    const homeyValue = safeDivide(kelvin - 2000, 4500);
    await this._sendTuyaDP(2, 0, 'enum');
    await this._sendTuyaDP(4, tuyaValue, 'value');
    await this.setCapabilityValue('light_temperature', parseFloat(homeyValue)).catch(() => { });
    await this.setCapabilityValue('light_mode', 'temperature').catch(() => { });
  }
  async onSettings({ newSettings, changedKeys }) {
    for (const key of changedKeys) {
      if (key === 'power_on_behavior') await this._setPowerOnBehavior(newSettings.power_on_behavior);
      if (key === 'do_not_disturb') await this._setDoNotDisturb(newSettings.do_not_disturb);
    }
  }
  async _setPowerOnBehavior(behavior) {
    const values = { off: 0, on: 1, previous: 2 };
    await this._sendTuyaDP(21, values[behavior] ?? 2, 'enum');
  }
  async _setDoNotDisturb(enabled) {
    await this._sendTuyaDP(26, enabled ? 1 : 0, 'bool');
  }
}
module.exports = RGBBulbDevice;

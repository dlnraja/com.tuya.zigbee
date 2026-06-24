'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const LightBase = require('../../lib/devices/UnifiedLightBase');

class RGBBulbLedDevice extends PhysicalButtonMixin(VirtualButtonMixin(LightBase)) {
  get mainsPowered() { return true; }

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
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
      await this._setupColorCluster(zclNode);
      this._setupRGBListeners();
      this.log('[RGB-LED] ✅ Ready');
    }, 'onNodeInit');
  }

  async _parseHSV(raw) {
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
        colorCluster.on('attr.currentHue', async (v) => await this.setCapabilityValue('light_hue', v / 254).catch(() => { }));
        colorCluster.on('attr.currentSaturation', async (v) => await this.setCapabilityValue('light_saturation', v / 254).catch(() => { }));
      }
    } catch (e) { /* ignore */ }
  }

  _setupRGBListeners() {
    if (this.hasCapability('light_hue')) {
      this.registerCapabilityListener('light_hue', async (v) => {
        return this._sendHSV();
      });
    }
    if (this.hasCapability('light_saturation')) {
      this.registerCapabilityListener('light_saturation', async (v) => {
        return this._sendHSV();
      });
    }
  }

  async _sendHSV() {
    await this._tryTuyaRgbMode?.(1)?.catch(() => { });
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

module.exports = RGBBulbLedDevice;

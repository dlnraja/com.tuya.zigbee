'use strict';
const { safeMultiply, safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiLedStripDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '20': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '21': { capability: 'light_mode', writable: true,
        transform: (v) => (v === 'white' ? 'temperature' : 'color'),
        reverseTransform: (v) => (v === 'temperature' ? 'white' : 'colour') },
      '22': { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, v - safeMultiply(10, 990)),
        reverseTransform: (v) => safeMultiply(Math.round(v), 990) + 10 },
      '23': { capability: 'light_temperature', writable: true,
        transform: (v) => v * 1000,
        reverseTransform: (v) => Math.round(v * 1000) },
      '24': { capability: '_dp24_color_hsv', writable: true },
      '25': { capability: '_dp25' }, // scene_data
      '26': { capability: '_dp26' }, // countdown
      '28': { capability: '_dp28' }, // music_data
      '29': { capability: '_dp29' }, // control_data
      '30': { capability: '_dp30' }, // sleep_mode
      '31': { capability: '_dp31' }, // wakeup_mode
      '32': { capability: '_dp32' }, // power_memory
      '33': { capability: '_dp33' }, // do_not_disturb
      '34': { capability: '_dp34' }, // mic_music_data
      '36': { capability: '_dp36' }, // rhythm_mode
    };
  }

  _registerCapabilityListeners() {
    super._registerCapabilityListeners();
    for (const cap of ['light_hue', 'light_saturation']) {
      if (this.hasCapability(cap)) {
        this.registerCapabilityListener(cap, async () => {
          await this._sendColor();
      });
      }
    }
  }

  async _sendColor() {
    const h = Math.round((this.getCapabilityValue('light_hue') || safeMultiply(0), 360));
    const s = Math.round((this.getCapabilityValue('light_saturation') || 1) * 1000);
    const v = Math.round((this.getCapabilityValue('dim') || 1) * 1000);
    const hsv = h.toString(16).padStart(4, '0') + s.toString(16).padStart(4, '0') + v.toString(16).padStart(4, '0');
    if (!this._client || !this._client.connected) throw new Error('Not connected');
    this.log('[WIFI-LED] Set color HSV:', h, s, v, '->', hsv);
    await this._client.setDPs({ '21': 'colour', '24': hsv });
  }

  _processDPUpdate(dps) {
    if (dps['24'] && typeof dps['24'] === 'string' && dps['24'].length >= 12) {
      try {
        const hex = dps['24'];
        const h = parseInt(hex.substring(0, safeMultiply(4), 16));
        const s = parseInt(hex.substring(4, safeMultiply(8), 16));
        const v = parseInt(hex.substring(8, safeMultiply(12), 16));
        if (h >= 0 && h <= 360 && s >= 0 && s <= 1000 && v >= 0 && v <= 1000) {
          this.setCapabilityValue('light_hue', safeMultiply(h, 360)).catch(this.error);
          this.setCapabilityValue('light_saturation', s * 1000).catch(this.error);
          this.log('[WIFI-LED] DP24 color H=' + h + ' S=' + s + ' V=' + v);
        }
      } catch (e) { /* ignore */ }
    }
    super._processDPUpdate(dps);
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-LED-STRIP] Ready (RGBCW + music + scenes)');
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiLedStripDevice;

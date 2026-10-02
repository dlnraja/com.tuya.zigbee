'use strict';

const { safeMultiply, safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const {
  decodeColor, encodeColor, detectColorFormat,
  detectLightSchema, legacyLightToModern, modernLightToLegacy,
} = require('../../lib/tuya-local/TuyaDeviceTemplates');

class WiFiLightDevice extends TuyaLocalDevice {
  get mainsPowered() { return true; }


  get dpMappings() {
    return {
      '20': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '21': { capability: 'light_mode', writable: true,
        transform: (v) => v === 'white' ? 'temperature' : 'color',
        reverseTransform: (v) => v === 'temperature' ? 'white' : 'colour' },
      '22': { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, safeDivide(v - 10, 990)),
        reverseTransform: (v) => Math.round(safeMultiply(v, 990) + 10) },
      '23': { capability: 'light_temperature', writable: true,
        transform: (v) => safeDivide(v, 1000),
        reverseTransform: (v) => Math.round(safeMultiply(v, 1000)) },
      '24': { capability: '_dp24_color_hsv', writable: true },
      '25': { capability: '_dp25' },
      '26': { capability: '_dp26' },
      '32': { capability: '_dp32' },
    };
  }

  async onInit() {
    // Learned per device: 'legacy' (DPs 1..5) or 'modern' (DPs 20..24); colour encoding v1/v2.
    try {
      this._lightSchema = this.getStoreValue('light_schema') || null;
      this._colorFormat = this.getStoreValue('light_color_format') || null;
    } catch (_e) { /* store not ready */ }

    await super.onInit();

    // Register custom HSV color capability listeners (hue & saturation)
    for (const cap of ['light_hue', 'light_saturation']) {
      if (this.hasCapability(cap)) {
        this.registerCapabilityListener(cap, async () => {
          await this._sendColor();
        });
      }
    }

    this.log('[WIFI-LIGHT] Ready (RGBCW with HSV color)');
  }

  _isLegacySchema() { return this._lightSchema === 'legacy'; }

  async _sendLightDps(dps) {
    if (!this._client || !this._client.connected) {
      throw new Error('Not connected');
    }
    await this._client.setDPs(this._isLegacySchema() ? modernLightToLegacy(dps) : dps);
  }

  async _setDP(dp, value) {
    const key = String(dp);
    if (this._isLegacySchema() && ['20', '21', '22', '23', '24'].includes(key)) {
      if (!this._client) {throw new Error('Device client not initialized');}
      const mapped = modernLightToLegacy({ [key]: value });
      const [legacyDp, legacyValue] = Object.entries(mapped)[0];
      await this._client.setDP(parseInt(legacyDp, 10), legacyValue);
      return;
    }
    await super._setDP(dp, value);
  }

  async _sendColor() {
    const hue = this.getCapabilityValue('light_hue') || 0;
    const saturation = this.getCapabilityValue('light_saturation');
    const value = this.getCapabilityValue('dim');
    // Modern encoding: "HHHHSSSSVVVV" (hex, H=0-360, S=0-1000, V=0-1000);
    // older firmwares expect the 14-char encoding — reuse whatever the device reported.
    const format = this._colorFormat === 'v1' ? 'v1' : 'v2';
    const color = encodeColor({
      hue,
      saturation: typeof saturation === 'number' ? saturation : 1,
      value: typeof value === 'number' && value > 0 ? value : 1,
    }, format);

    this.log('[WIFI-LIGHT] Set color', format, '->', color);
    // In legacy schema the 24 -> 5 translation re-encodes to the 14-char form.
    await this._sendLightDps({ '21': 'colour', '24': color });
  }

  async _learnLightSchema(dps) {
    if (this._lightSchema) {return;}
    const schema = detectLightSchema(dps);
    if (!schema) {return;}
    this._lightSchema = schema;
    this.log(`[WIFI-LIGHT] DP layout detected: ${schema}`);
    try { await this.setStoreValue('light_schema', schema); } catch (_e) { /* non-critical */ }
  }

  async _onData(data) {
    if (this._destroyed) {return;}
    if (data && data.dps) {
      await this._learnLightSchema(data.dps);
      if (this._isLegacySchema()) {
        const raw5 = data.dps['5'];
        if (typeof raw5 === 'string' && detectColorFormat(raw5)) {this._colorFormat = detectColorFormat(raw5);}
        data = { ...data, dps: legacyLightToModern(data.dps) };
      }
      const dps = data.dps;

      // Parse DP24 color (12-char or 14-char encoding) before standard processing
      if (typeof dps['24'] === 'string') {
        try {
          if (!this._isLegacySchema()) {
            const fmt = detectColorFormat(dps['24']);
            if (fmt && fmt !== this._colorFormat) {
              this._colorFormat = fmt;
              this.setStoreValue('light_color_format', fmt).catch(() => {});
            }
          }
          const c = decodeColor(dps['24']);
          if (c) {
            await this.safeSetCapabilityValue('light_hue', c.hue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
            await this.safeSetCapabilityValue('light_saturation', c.saturation).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
            this.log(`[WIFI-LIGHT] DP24 color parsed (${c.format}): H=${Math.round(c.hue * 360)} S=${c.saturation.toFixed(2)} V=${c.value.toFixed(2)}`);
          }
        } catch (e) {
          this.error('[WIFI-LIGHT] Failed to parse DP24 color:', e.message);
        }
      }
    }

    await super._onData(data);
  }

  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiLightDevice;

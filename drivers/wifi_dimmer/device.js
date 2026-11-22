'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const BrightnessScale = require('../../lib/dimmer/BrightnessScale');

class WiFiDimmerDevice extends PhysicalButtonMixin(VirtualButtonMixin(TuyaLocalDevice)) {

  get mainsPowered() { return true; }
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      // WHY(P3381 / forum 21313 #300): default stays 10-1000; a 0-100 / 0-255 / 0-1000 dimmer is picked
      // from the 'brightness_scale' setting, the echo of our own write (uint8 wrap) or a report above range.
      '2': { capability: 'dim', writable: true,
        transform: (v) => this._dimFromRaw(v),
        reverseTransform: (v) => this._dimToRaw(v) },
      '3': { capability: null },
      '5': { capability: null },
      '7': { capability: null },
      '14': { capability: null },
    };
  }

  _brightScaleId() {
    let setting = 'auto';
    try { setting = (this.getSetting && this.getSetting('brightness_scale')) || 'auto'; } catch (_) { /* tests */ }
    let detected = null; let observedMax = null;
    try {
      detected = this.getStoreValue && this.getStoreValue('bright_scale_detected');
      observedMax = this.getStoreValue && this.getStoreValue('bright_raw_max');
    } catch (_) { /* tests */ }
    return BrightnessScale.resolveScale({ setting, detected, observedMax, fallback: '10-1000' });
  }

  _dimFromRaw(v) {
    const raw = Number(v);
    if (Number.isFinite(raw)) {
      const last = this._lastDimWrite;
      if (last && Date.now() - last.at < 5000) {
        const echo = BrightnessScale.scaleFromEcho(last.raw, raw);
        if (echo && this.setStoreValue) {
          this._lastDimWrite = null;
          this.setStoreValue('bright_scale_detected', echo).catch(() => {});
          this.log(`[WIFI-DIMMER] brightness scale detected from echo: ${echo}`);
          return undefined; // WHY: the echo is a wrapped value, do not show it; next report uses the new scale
        }
      }
      const prevMax = Number(this.getStoreValue && this.getStoreValue('bright_raw_max')) || 0;
      if (raw > prevMax && raw <= 100000 && this.setStoreValue) {this.setStoreValue('bright_raw_max', raw).catch(() => {});}
    }
    const dim = BrightnessScale.toDim(raw, this._brightScaleId());
    return dim === null ? undefined : dim;
  }

  _dimToRaw(v) {
    const raw = BrightnessScale.fromDim(v, this._brightScaleId());
    this._lastDimWrite = { raw, at: Date.now() };
    return raw;
  }

  async onInit() {
    await super.onInit();
    await this.initVirtualButtons();
    this.log('[WIFI-DIMMER] Ready');
  }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiDimmerDevice;

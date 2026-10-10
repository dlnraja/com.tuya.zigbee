'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');
const { colourPayload, dimToDp } = require('../../lib/tuya/SpiPixelColour');
const { sendMultiDp } = require('../../lib/tuya/TuyaMultiDpFrame');
const DpCoalescer = require('../../lib/tuya/DpCoalescer');

// DP layout from zigbee-herdsman-converters gledopto.ts "GL-SPI-206P" (Koen Kanters and contributors); own implementation.
// DP1 on/off, DP2 work mode (0 white, 1 colour, 2 scene, 3 music), DP3 brightness 10-1000, DP61 colour frame (h, s, v).
// Reliability port from master: bursts of writes freeze the MCU (Z2M #32754) -> one coalesced EF00 frame per change.
const TYPES = { 1: 'bool', 2: 'enum', 3: 'value', 61: 'raw' };

class LedControllerSpiTuyaDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'],
      dps: {
        1: { cap: 'onoff', kind: 'bool', readOnly: true },
        3: { cap: 'dim', kind: 'value', divisor: 1000, readOnly: true },
      },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this._dpq = new DpCoalescer({ homey: this.homey, debounceMs: 150, verifyMs: 0, send: async (frame) => this._sendFrame(frame) });
    this._colour = this.getStoreValue('spi_colour_mode') === true;
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (on) => this._dpq.set(1, !!on));
    }
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (v) => {
        if (!(v > 0)) { return this._dpq.set(1, false); }
        if (this.getCapabilityValue('onoff') !== true) { this._dpq.set(1, true); }
        // WHY: in colour mode the brightness lives inside the DP61 frame; DP3 alone is ignored there.
        if (this._colour) { return this._dpq.set(61, this._colourFrame(undefined, undefined, v)); }
        return this._dpq.set(3, dimToDp(v));
      });
    }
    if (this.hasCapability('light_hue') && this.hasCapability('light_saturation')) {
      this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], async (values) => {
        if (this.getCapabilityValue('onoff') !== true) { this._dpq.set(1, true); }
        if (!this._colour) { this._dpq.set(2, 1); }
        this._setColourMode(true);
        return this._dpq.set(61, this._colourFrame(values.light_hue, values.light_saturation));
      }, 300);
    }
  }

  _setColourMode(on) {
    this._colour = on;
    this.setStoreValue('spi_colour_mode', on).catch(() => {});
  }

  /** DP61 is write-only: hue/saturation kept in memory + store; brightness follows dim (was forced to 100%). */
  _colourFrame(hue, sat, dim) {
    const mem = this._hs || this.getStoreValue('spi_hs') || {};
    const h = hue ?? mem.h ?? this.getCapabilityValue('light_hue') ?? 0;
    const s = sat ?? mem.s ?? this.getCapabilityValue('light_saturation') ?? 1;
    this._hs = { h, s };
    this.setStoreValue('spi_hs', this._hs).catch(() => {});
    return colourPayload(h, s, dimToDp(dim ?? this.getCapabilityValue('dim') ?? 1));
  }

  _onProfileDP(dp, raw) {
    super._onProfileDP(dp, raw);
    if (dp === 2) {
      const m = Number(raw);
      if (m === 0 || m === 1) { this._setColourMode(m === 1); }
    }
  }

  async _sendFrame(frame) {
    const list = frame.map(({ dp, value }) => ({ dp, value, type: TYPES[dp] || 'value' }));
    if (await sendMultiDp(this, list)) { return true; }
    for (const { dp, value, type } of list) {
      const r = await sendEf00DpMaxFallback(this, dp, value, type);
      if (r === false) { throw new Error(`dp_${dp}_not_sent`); }
    }
    return true;
  }

  async onDeleted() {
    if (this._dpq) { this._dpq.destroy(); this._dpq = null; }
    if (super.onDeleted) { await super.onDeleted(); }
  }
}

module.exports = LedControllerSpiTuyaDevice;

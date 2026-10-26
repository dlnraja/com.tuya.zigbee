'use strict';

const TuyaDpProfileDevice = require('./TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../zigbee/Ef00OnlyInterview');
const { colourPayload, dimToDp, tempToDp, parseColourFrame } = require('../tuya/SpiPixelColour');
const { sendMultiDp } = require('../tuya/TuyaMultiDpFrame');
const DpCoalescer = require('../tuya/DpCoalescer');

// DP layout from zigbee-herdsman-converters gledopto.ts "GL-SPI-206P" (Koen Kanters and contributors); own implementation.
// DP1 on/off, DP2 work mode (0 white, 1 colour, 2 scene, 3 music), DP3 brightness 10-1000, DP4 colour temp 0-1000
// (0 = warm), DP61 colour frame (h, s, v). Bursts of writes freeze the MCU (Z2M #32754): one coalesced frame.
const TYPES = { 1: 'bool', 2: 'enum', 3: 'value', 4: 'value', 61: 'raw' };
const CAPS = ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'];
// WHY(P3067 family 8, Z2M gledopto.ts GL-SPI-206P): strip set-up DPs as non-blocking settings, written only when
// the user changes them, one DP at a time (bursts freeze the MCU, Z2M #32754). Nothing is written at pairing.
const SPI_SETTINGS = {
  spi_pixel_count: { dp: 53, type: 'value', min: 10, max: 1000 },
  spi_bead_sequence: { dp: 101, type: 'enum', min: 0, max: 17 },
  spi_chip_type: { dp: 102, type: 'enum', min: 0, max: 9 },
  spi_do_not_disturb: { dp: 103, type: 'bool' },
};
const SPI_REPORT = { 53: 'spi_pixel_count', 101: 'spi_bead_sequence', 102: 'spi_chip_type', 103: 'spi_do_not_disturb' };

class LedControllerSpiTuyaDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    // WHY: every manifest capability listed, so the base never removes light_temperature/light_mode at boot.
    // DP1/DP3 are RX-only here: TX goes through the coalescer below (single frame, like Z2M).
    return {
      capabilities: CAPS,
      dps: {
        1: { cap: 'onoff', kind: 'bool', readOnly: true },
        // DP3 is handled in _onProfileDP: it is the white brightness only (in colour mode it lives in DP61).
      },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this._dpq = new DpCoalescer({
      homey: this.homey,
      debounceMs: 150,
      verifyMs: 0,
      send: async (frame) => this._sendFrame(frame),
    });
    const has = (c) => this.hasCapability(c);

    if (has('onoff')) {
      this.registerCapabilityListener('onoff', async (on) => this._dpq.set(1, !!on));
    }
    if (has('dim')) {
      this.registerCapabilityListener('dim', async (v) => {
        if (!(v > 0)) { return this._dpq.set(1, false); } // dim 0 = off (DP3 floor is 10)
        if (this.getCapabilityValue('onoff') !== true) { this._dpq.set(1, true); }
        // WHY: in colour mode the brightness lives inside the DP61 frame; DP3 alone is ignored there.
        if (this._mode() === 'color') { return this._dpq.set(61, this._colourFrame(undefined, undefined, v)); }
        return this._dpq.set(3, dimToDp(v));
      });
    }
    if (has('light_hue') && has('light_saturation')) {
      this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], async (values) => {
        if (this.getCapabilityValue('onoff') !== true) { this._dpq.set(1, true); }
        if (this._mode() !== 'color') { this._dpq.set(2, 1); }
        const p = this._dpq.set(61, this._colourFrame(values.light_hue, values.light_saturation));
        if (has('light_mode')) { this.safeSetCapabilityValue('light_mode', 'color').catch(() => {}); }
        return p;
      }, 300);
    }
    if (has('light_temperature')) {
      this.registerCapabilityListener('light_temperature', async (t) => {
        if (this.getCapabilityValue('onoff') !== true) { this._dpq.set(1, true); }
        if (this._mode() !== 'temperature') { this._dpq.set(2, 0); }
        this._dpq.set(4, tempToDp(t));
        // Z2M sends DP4 + DP3 together in white mode so the white brightness follows the dim slider.
        const p = this._dpq.set(3, dimToDp(this.getCapabilityValue('dim') ?? 1));
        if (has('light_mode')) { this.safeSetCapabilityValue('light_mode', 'temperature').catch(() => {}); }
        return p;
      });
    }
    if (has('light_mode')) {
      this.registerCapabilityListener('light_mode', async (m) => {
        if (m === 'color') { return this._dpq.set(61, this._colourFrame()); }
        this._dpq.set(2, 0);
        return this._dpq.set(3, dimToDp(this.getCapabilityValue('dim') ?? 1));
      });
    }
  }

  _mode() { return this.getCapabilityValue('light_mode') || 'color'; }

  /** DP61 frame; hue/saturation are kept in memory + store (also refreshed from DP61 reports), brightness from dim. */
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
    if (dp === 3 || dp === 61) { this._onBrightnessOrColour(dp, raw); }
    if (SPI_REPORT[dp]) { this._mirrorSetting(SPI_REPORT[dp], raw); }
    // DP2 work mode report keeps light_mode honest (0 white, 1 colour; scene/music left as is).
    if (dp === 2 && this.hasCapability('light_mode')) {
      const m = Number(raw);
      if (m === 0) { this.safeSetCapabilityValue('light_mode', 'temperature').catch(() => {}); }
      if (m === 1) { this.safeSetCapabilityValue('light_mode', 'color').catch(() => {}); }
    }
    if (dp === 4 && this.hasCapability('light_temperature') && Number.isFinite(Number(raw))) {
      const t = Math.max(0, Math.min(1, 1 - (Number(raw) / 1000)));
      this.safeSetCapabilityValue('light_temperature', t).catch(() => {});
    }
  }

  _onBrightnessOrColour(dp, raw) {
    if (dp === 3) {
      // Z2M glspi206p_brightness: only meaningful in white mode.
      const v = Number(raw);
      if (this._mode() === 'color' || !Number.isFinite(v) || !this.hasCapability('dim')) { return; }
      this.safeSetCapabilityValue('dim', Math.max(0.01, Math.min(1, v / 1000))).catch(() => {});
      return;
    }
    const c = parseColourFrame(raw);
    if (!c) { return; }
    this._hs = { h: c.hue, s: c.sat };
    if (this.hasCapability('light_hue')) { this.safeSetCapabilityValue('light_hue', c.hue).catch(() => {}); }
    if (this.hasCapability('light_saturation')) { this.safeSetCapabilityValue('light_saturation', c.sat).catch(() => {}); }
    if (this.hasCapability('dim')) { this.safeSetCapabilityValue('dim', c.dim).catch(() => {}); }
    if (this.hasCapability('light_mode')) { this.safeSetCapabilityValue('light_mode', 'color').catch(() => {}); }
  }

  /** Keeps the settings page in line with what the controller reports; never blocks the receive path. */
  _mirrorSetting(key, raw) {
    const def = SPI_SETTINGS[key];
    let v = Buffer.isBuffer(raw) ? raw.readUIntBE(0, Math.min(raw.length, 4)) : raw;
    if (def.type === 'bool') { v = v === true || v === 1; } else { v = Number(v); }
    if (def.type !== 'bool' && !(v >= def.min && v <= def.max)) { return; }
    const out = def.type === 'enum' ? String(v) : v;
    if (this.getSetting?.(key) === out) { return; }
    Promise.resolve().then(() => this.setSettings?.({ [key]: out })).catch(() => {});
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') { await super.onSettings({ oldSettings, newSettings, changedKeys }); }
    const mine = (changedKeys || []).filter((k) => SPI_SETTINGS[k]);
    if (!mine.length) { return; }
    (async () => {
      for (const k of mine) {
        const def = SPI_SETTINGS[k];
        let v = newSettings[k];
        if (def.type === 'bool') { v = Boolean(v); } else { v = Math.max(def.min, Math.min(def.max, Math.round(Number(v)) || def.min)); }
        await sendEf00DpMaxFallback(this, def.dp, v, def.type).catch(() => false);
      }
    })().catch(() => {});
  }

  /** One EF00 frame for the whole coalesced change; per-DP max fallback only if no single-frame path exists. */
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

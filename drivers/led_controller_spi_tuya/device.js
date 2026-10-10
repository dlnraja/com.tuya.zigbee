'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');
const { colourPayload, dimToDp, tempToDp } = require('../../lib/tuya/SpiPixelColour');
const DpCoalescer = require('../../lib/tuya/DpCoalescer');

// DP layout from zigbee-herdsman-converters gledopto.ts "GL-SPI-206P" (Koen Kanters and contributors); own implementation.
// DP1 on/off, DP2 work mode (0 white, 1 colour, 2 scene, 3 music), DP3 brightness 10-1000, DP4 colour temp 0-1000
// (0 = warm), DP61 colour frame (h, s, v). Bursts of writes freeze the MCU (Z2M #32754): writes are coalesced.
const TYPES = { 1: 'bool', 2: 'enum', 3: 'value', 4: 'value', 61: 'raw' };

class LedControllerSpiTuyaDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'],
      dps: {
        1: { cap: 'onoff', kind: 'bool' },
        3: { cap: 'dim', kind: 'value', divisor: 1000, readOnly: true },
      },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this._dpq = new DpCoalescer({
      debounceMs: 150,
      verifyMs: 0,
      send: async (frame) => { for (const { dp, value } of frame) { await this._send(dp, value, TYPES[dp] || 'value'); } },
    });
    for (const cap of ['light_temperature', 'light_mode']) {
      if (!this.hasCapability(cap)) { await this.addCapability(cap).catch(() => {}); }
    }
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (v) => this._dpq.set(3, dimToDp(v)));
    }
    if (this.hasCapability('light_hue') && this.hasCapability('light_saturation')) {
      this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], async (values) => {
        const hue = values.light_hue ?? this.getCapabilityValue('light_hue') ?? 0;
        const sat = values.light_saturation ?? this.getCapabilityValue('light_saturation') ?? 1;
        const bri = dimToDp(this.getCapabilityValue('dim') ?? 1); // keep current brightness
        if (this.getCapabilityValue('onoff') !== true) { this._dpq.set(1, true); }
        this._dpq.set(2, 1);
        await this._dpq.set(61, colourPayload(hue, sat, bri));
        if (this.hasCapability('light_mode')) { this.setCapabilityValue('light_mode', 'color').catch(() => {}); }
      }, 300);
    }
    if (this.hasCapability('light_temperature')) {
      this.registerCapabilityListener('light_temperature', async (t) => {
        if (this.getCapabilityValue('onoff') !== true) { this._dpq.set(1, true); }
        this._dpq.set(2, 0);
        await this._dpq.set(4, tempToDp(t));
        if (this.hasCapability('light_mode')) { this.setCapabilityValue('light_mode', 'temperature').catch(() => {}); }
      });
    }
    if (this.hasCapability('light_mode')) {
      this.registerCapabilityListener('light_mode', async (m) => this._dpq.set(2, m === 'temperature' ? 0 : 1));
    }
  }

  async _send(dp, value, type) {
    const r = await sendEf00DpMaxFallback(this, dp, value, type);
    if (r === false) { throw new Error(`dp_${dp}_not_sent`); }
    return true;
  }

  onDeleted() { if (this._dpq) { this._dpq.destroy(); } if (super.onDeleted) { return super.onDeleted(); } return undefined; }
}

module.exports = LedControllerSpiTuyaDevice;

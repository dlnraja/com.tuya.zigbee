'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');
const { colourPayload, dimToDp } = require('../../lib/tuya/SpiPixelColour');

// DP layout from zigbee-herdsman-converters gledopto.ts "GL-SPI-206P" (Koen Kanters and contributors); own implementation.
// DP1 on/off, DP2 work mode (0 white, 1 colour, 2 scene, 3 music), DP3 brightness 10-1000, DP61 colour frame (h, s, v).
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
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (v) => this._send(3, dimToDp(v), 'value'));
    }
    if (this.hasCapability('light_hue') && this.hasCapability('light_saturation')) {
      this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], async (values) => {
        const hue = values.light_hue ?? this.getCapabilityValue('light_hue') ?? 0;
        const sat = values.light_saturation ?? this.getCapabilityValue('light_saturation') ?? 1;
        if (this.getCapabilityValue('onoff') !== true) { await this._send(1, true, 'bool'); }
        await this._send(2, 1, 'enum');
        await this._send(61, colourPayload(hue, sat), 'raw');
      }, 300);
    }
  }

  async _send(dp, value, type) {
    const r = await sendEf00DpMaxFallback(this, dp, value, type);
    if (r === false) { throw new Error(`dp_${dp}_not_sent`); }
    return true;
  }
}

module.exports = LedControllerSpiTuyaDevice;

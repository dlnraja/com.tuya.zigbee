'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class ContactSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_contact', 'measure_battery', 'alarm_tamper'];
  }

  get dpMappings() {
    return {
      1: {
        capability: 'alarm_contact',
        transform: (v) => {
          if (typeof v === 'boolean') return !v;
          return v === 0 || v === 'open';
        },
        debounce: 500
      },
      2: { capability: 'measure_battery', divisor: 1 },
      3: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      5: { capability: 'alarm_tamper', transform: (v) => v === true || v === 1 },
      6: { internal: true, type: 'battery_voltage' },
      101: { capability: 'measure_luminance', divisor: 1 },
    };
  }

  async onNodeInit({ zclNode }) {
    this._contactState = {
      lastValue: null,
      lastChangeTime: 0,
      timer: null,
      confirmedValue: null
    };

    const userInvert = this.getSetting('invert_contact') || false;
    this._invertContact = userInvert;
    this._debounceMs = 2000;

    await super.onNodeInit({ zclNode });
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'alarm_contact') {
      const finalValue = this._invertContact ? !value : value;
      const now = Date.now();
      const state = this._contactState;

      if (state.confirmedValue === finalValue) return;

      const timeSinceLastChange = now - state.lastChangeTime;

      if (state.lastValue !== null && timeSinceLastChange < this._debounceMs) {
        if (state.timer) this.homey.clearTimeout(state.timer);
        state.timer = this.homey.setTimeout(async () => {
          state.lastValue = finalValue;
          state.confirmedValue = finalValue;
          state.lastChangeTime = Date.now();
          await super.setCapabilityValue(capability, finalValue).catch(() => { });
        }, this._debounceMs);
        return;
      }

      state.lastValue = finalValue;
      state.confirmedValue = finalValue;
      state.lastChangeTime = now;
      if (state.timer) {
        this.homey.clearTimeout(state.timer);
        state.timer = null;
      }

      return super.setCapabilityValue(capability, finalValue);
    }
    return super.setCapabilityValue(capability, value);
  }
}

module.exports = ContactSensorDevice;

'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class ZigBeeContactSensorDevice extends UnifiedSensorBase {
  async onNodeInit({ zclNode }) {
    this._contactState = {
      lastValue: null,
      lastChangeTime: 0,
      timer: null,
      confirmedValue: null
    };
    this._debounceMs = 2000;
    await super.onNodeInit({ zclNode });
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'alarm_contact') {
      const finalValue = value;
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

module.exports = ZigBeeContactSensorDevice;

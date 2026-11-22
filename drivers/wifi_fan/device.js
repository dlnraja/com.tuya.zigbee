'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const { fanSpeedToPercent, percentToFanSpeed } = require('../../lib/tuya-local/TuyaDeviceTemplates');
const { safeSetTimeout } = require('../../lib/utils/safe-timers');

// WHY(2026-10-10): enum fan_speed firmwares (tuya-local fan configs: low/middle/high, level_1..) gave
// Number('low') = NaN -> dim 0. Known token ladders are converted with the shared helpers; numeric
// firmwares keep the fan_speed_min/max range path unchanged.
const FAN_TOKEN_LADDERS = Object.freeze([
  ['low', 'middle', 'high'], ['low', 'mid', 'high'], ['low', 'medium', 'high'],
  ['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'level_6'],
  ['sleep', 'low', 'middle', 'high', 'strong'],
]);
function ladderFor(token) {
  const t = String(token).toLowerCase();
  return FAN_TOKEN_LADDERS.find((l) => l.includes(t)) || null;
}


class WiFiFanDevice extends TuyaLocalDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  _getFanSpeedRange() {
    const min = Number(this.getSetting?.('fan_speed_min'));
    const max = Number(this.getSetting?.('fan_speed_max'));
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      return { min, max };
    }
    return { min: 0, max: 100 };
  }

  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: null },
      '3':  { capability: 'dim', writable: true,
        transform: (v) => {
          const val = Number(v);
          if (!Number.isFinite(val)) {return 0;}
          const { min, max } = this._getFanSpeedRange();
          return Math.max(0, Math.min(1, (val - min) / (max - min)));
        },
        reverseTransform: (v) => {
          const val = Number(v);
          const { min, max } = this._getFanSpeedRange();
          if (!Number.isFinite(val)) {return min;}
          return Math.round(min + (Math.max(0, Math.min(1, val)) * (max - min)));
        } },
      '4':  { capability: null },
      '6':  { capability: null },
      '8':  { capability: null },
      '9':  { capability: 'onoff.light', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '10': { capability: null },
      '11': { capability: null },
      '12': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    this._fanQuirkState = { lightUserOn: false };
    this.log('[WIFI-FAN] Ready');
  }

  async _onData(data) {
    await super._onData(data);
    this._applyFanCourtesyQuirks(data && data.dps);
  }

  async _setDP(dp, value, opts) {
    const settings = (typeof this.getSettings === 'function' ? this.getSettings() : null) || {};
    const FanCourtesyQuirks = require('../../lib/tuya-local/FanCourtesyQuirks');
    if (Number(dp) === 9) {
      this._fanQuirkState = FanCourtesyQuirks.markUserLight(this._fanQuirkState, !!value);
    }
    if (Number(dp) === 1 && value === true && settings.remember_direction_off === true) {
      const plan = FanCourtesyQuirks.planFanOn(this._fanQuirkState, {
        rememberDirection: true,
        fanDp: 1,
        directionDp: 101,
      });
      this._fanQuirkState = plan.state;
      if (plan.dps['101'] != null && typeof this._setMultipleDPs === 'function') {
        await this._setMultipleDPs(plan.dps);
        return;
      }
    }
    if (Number(dp) === 3 && settings.speed_as_text === true) {
      value = FanCourtesyQuirks.coerceSpeed(value, { asText: true });
    }
    return super._setDP(dp, value, opts);
  }

  _applyFanCourtesyQuirks(dps) {
    if (!dps || typeof dps !== 'object') {return;}
    const settings = (typeof this.getSettings === 'function' ? this.getSettings() : null) || {};
    const FanCourtesyQuirks = require('../../lib/tuya-local/FanCourtesyQuirks');
    if (Object.prototype.hasOwnProperty.call(dps, '101')) {
      const dir = FanCourtesyQuirks.coerceDirection(dps['101']);
      if (dir != null) {
        this._fanQuirkState = this._fanQuirkState || {};
        this._fanQuirkState.pendingDirection = dir;
      }
    }
    const fanOff = Object.prototype.hasOwnProperty.call(dps, '1') && dps['1'] === false;
    if (fanOff && settings.keep_light_off_when_fan_off === true) {
      const plan = FanCourtesyQuirks.planFanOff(this._fanQuirkState, { keepLightOff: true, rememberDirection: settings.remember_direction_off === true });
      this._fanQuirkState = plan.state;
      for (const action of plan.actions) {
        safeSetTimeout(this, () => {
          this._setDP(9, false, { capability: 'onoff.light', userAction: false }).catch(() => {});
        }, action.atMs);
      }
    }
    if (Object.prototype.hasOwnProperty.call(dps, '9') && dps['9'] === true && FanCourtesyQuirks.shouldOverrideLightOn(this._fanQuirkState)) {
      this._setDP(9, false, { capability: 'onoff.light', userAction: false }).catch(() => {});
    }
  }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiFanDevice;

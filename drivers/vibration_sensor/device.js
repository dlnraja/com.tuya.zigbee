'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { boolean } = require('../../lib/converters/ValueConverterRegistry');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');
const MfrHelper = require('../../lib/helpers/ManufacturerNameHelper');

/**
 * Vibration Sensor Device — P2422 HOBEIAN ZG-102ZM / ZG-103Z / ZG-228Z enrich
 * WHY: Z2M DP maps differ by couple; generic map missed contact (DP101) + tilt (DP7).
 */
class VibrationSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    const caps = ['alarm_vibration', 'measure_battery', 'alarm_tamper', 'button.1'];
    if (this._isHobeian102ZM()) {
      caps.push('alarm_contact');
    } else {
      caps.push('measure_temperature');
    }
    return caps;
  }

  _modelPid() {
    return (
      this.getStoreValue?.('modelId')
      || this.getSetting?.('zb_model_id')
      || this.getData?.()?.productId
      || ''
    );
  }

  _mfr() {
    try {
      return MfrHelper.getManufacturerName(this) || this.getSetting?.('zb_manufacturer_name') || '';
    } catch (_) {
      return this.getSetting?.('zb_manufacturer_name') || '';
    }
  }

  _isHobeian102ZM() {
    const pid = String(this._modelPid()).toUpperCase();
    const mfr = this._mfr();
    if (pid.includes('ZG-102ZM') || pid.includes('AY02SZ')) { return true; }
    return includesCI(mfr, 'jfw0a4aa') || includesCI(mfr, 'wzk0x7fq');
  }

  _isHobeian103Z() {
    const pid = String(this._modelPid()).toUpperCase();
    const mfr = this._mfr();
    if (pid.includes('ZG-103Z')) { return true; }
    return (
      includesCI(mfr, 'iba1ckek')
      || includesCI(mfr, 'hggxgsjj')
      || includesCI(mfr, 'yjryxpot')
      || includesCI(mfr, 'afycb3cg')
    );
  }

  _isHobeian228Z() {
    return String(this._modelPid()).toUpperCase().includes('ZG-228Z');
  }

  get dpMappings() {
    // Z2M ZG-102ZM: vibration + contact (inverse) + battery + sensitivity
    if (this._isHobeian102ZM()) {
      return {
        1: { capability: 'alarm_vibration', transform: boolean() },
        // WHY(P2422): Z2M inverse — 0=closed(true contact), 1=open(false)
        101: {
          capability: 'alarm_contact',
          transform: (v) => {
            if (v === true || v === 1 || v === '1') { return true; } // open
            if (v === false || v === 0 || v === '0') { return false; } // closed
            return !!v;
          },
        },
        4: { capability: 'measure_battery', divisor: 1 },
        6: { capability: null, setting: 'sensitivity', min: 1, max: 50 },
      };
    }

    // Z2M ZG-103Z: vibration + tilt + xyz + battery + sensitivity enum
    if (this._isHobeian103Z()) {
      return {
        1: { capability: 'alarm_vibration', transform: boolean() },
        7: { capability: 'alarm_tamper', transform: boolean() }, // tilt → tamper UX
        105: { capability: 'measure_battery', divisor: 1 },
        104: { capability: null, setting: 'sensitivity' },
        101: { capability: null, internal: 'axis_x' },
        102: { capability: null, internal: 'axis_y' },
        103: { capability: null, internal: 'axis_z' },
      };
    }

    // Z2M ZG-228Z vibration alarm
    if (this._isHobeian228Z()) {
      return {
        1: { capability: 'alarm_vibration', transform: boolean() },
        4: { capability: 'measure_battery', divisor: 1 },
        6: { capability: null, setting: 'sensitivity', min: 1, max: 50 },
        101: { capability: null, internal: 'vibration_siren' },
        102: { capability: null, internal: 'muffling' },
        105: { capability: 'alarm_tamper', transform: boolean() },
        106: { capability: null, internal: 'alarm_time' },
      };
    }

    // Generic Tuya vibration
    return {
      1: { capability: 'alarm_vibration', transform: boolean() },
      2: { capability: 'alarm_tamper', transform: boolean() },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      18: { capability: 'measure_temperature', smartDivisor: true },
      19: { capability: 'measure_temperature', smartDivisor: true },
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[VIBRATION] P2422 init...');
    await super.onNodeInit({ zclNode });

    for (const cap of this.sensorCapabilities) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
      }
    }
    // Strip phantom temp on 102ZM (battery contact+vibration only)
    if (this._isHobeian102ZM() && this.hasCapability('measure_temperature')) {
      await this.removeCapability('measure_temperature').catch(() => {});
    }

    this.log('[VIBRATION] Ready', {
      pid: this._modelPid(),
      map: this._isHobeian102ZM() ? 'ZG-102ZM' : this._isHobeian103Z() ? 'ZG-103Z' : this._isHobeian228Z() ? 'ZG-228Z' : 'generic',
    });
  }

  onTuyaDP(dpId, value, dpType) {
    const mapping = this.dpMappings[dpId];
    if (mapping) {
      if (!mapping.capability) {
        // settings / internal — ignore silently (writable via settings TX elsewhere)
        return undefined;
      }
      let val;
      if (mapping.transform) {
        const _xf = typeof mapping.transform === 'object' && typeof mapping.transform.fromDevice === 'function'
          ? mapping.transform.fromDevice : mapping.transform;
        val = _xf(value);
      } else if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        val = smartParse(value, dpId, {
          manufacturerName: this.getSetting('zb_manufacturer_name') || '',
          capability: mapping.capability,
          deviceId: this.getData()?.id || '',
        });
      } else {
        val = mapping.divisor ? value / mapping.divisor : value;
      }
      if (mapping.capability) {
        return this.safeSetCapabilityValue(mapping.capability, val).then(() => {
          if (mapping.capability === 'alarm_vibration' && val === true) {
            const seconds = Number(this.getSetting?.('vibration_auto_reset')) || 0;
            if (seconds > 0) {
              if (this._vibrationResetTimer) {
                safeClearTimeout(this, this._vibrationResetTimer);
              }
              this._vibrationResetTimer = safeSetTimeout(this, () => {
                if (this._destroyed) { return; }
                this.log(`[VIBRATION] auto-reset idle after ${seconds}s`);
                this.safeSetCapabilityValue('alarm_vibration', false).catch(() => {});
              }, seconds * 1000);
            }
          }
        }).catch(() => {});
      }
    }
    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = VibrationSensorDevice;

'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { setupSonoffSensor, handleSonoffSensorSettings } = require('../../lib/mixins/SonoffSensorMixin');

const VALIDATION = {
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
};

const BATTERY_THROTTLE_MS = 300000;

const DEBOUNCE = {
  DEFAULT_MS: 2000,
  PROBLEMATIC_MIN_MS: 3000,
  KEEP_ALIVE_MIN_MS: 3600000,
  KEEP_ALIVE_MAX_MS: 4000000,
};

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
      2: { 
        capability: 'measure_battery', 
        transform: (v) => Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, v))
      },
      3: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      4: { 
        capability: 'measure_battery', 
        transform: (v) => Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, v))
      },
      15: { 
        capability: 'measure_battery', 
        transform: (v) => Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, v))
      },
      5: { capability: 'alarm_tamper', transform: (v) => v === true || v === 1 },
      6: { internal: true, type: 'battery_voltage' },
      9: { setting: 'sensitivity' },
      10: { setting: 'report_interval' },
      101: { capability: 'measure_luminance', divisor: 1 },
    };
  }

  async onNodeInit({ zclNode }) {
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        }
      ]);
    } catch (err) {
      this.log('Attribute reporting config failed:', err.message);
    }

    this._contactState = {
      lastValue: null,
      lastChangeTime: 0,
      lastIASTime: 0,
      iasMessageCount: 0,
      timer: null,
      confirmedValue: null
    };

    const userInvert = this.getSetting('invert_contact') || false;
    const userReverse = this.getSetting('reverse_alarm') || false;
    this._invertContact = userInvert || userReverse;
    this._userExplicitInvert = this._invertContact;
    this._debounceMs = DEBOUNCE.DEFAULT_MS;
    this._lastBatteryReportTime = 0;

    const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    this._isProblematicSensor = [
      '_TZ3000_bpkijo14',
      '_TZ3000_x8q36xwf',
      '_TZ3000_402jjyro',
      '_TZ3000_n2egfsli'
    ].includes(mfr);

    const invertedByDefault = [
      '_TZ3000_26fmupbb',
      '_TZ3000_n2egfsli',
      '_TZ3000_oxslv1c9',
      '_TZ3000_402jjyro',
      '_TZ3000_2mbfxlzr',
      '_TZ3000_bzxloft2',
      '_TZ3000_yxqnffam',
      '_TZ3000_996rpfy6',
      '_TZE200_pay2byax',
    ].some(id => mfr.toLowerCase().includes(id.toLowerCase()));
    
    this._invertedByDefault = invertedByDefault;
    if (invertedByDefault) {
      this._invertContact = !(userInvert || userReverse);
      this._userExplicitInvert = false;
    }

    if (this._isProblematicSensor) {
      this._debounceMs = Math.max(this._debounceMs, DEBOUNCE.PROBLEMATIC_MIN_MS);
    }

    await super.onNodeInit({ zclNode });
    await setupSonoffSensor(this, zclNode);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('invert_contact') || changedKeys.includes('reverse_alarm')) {
      const inv = changedKeys.includes('invert_contact') ? newSettings.invert_contact : (this.getSetting('invert_contact') || false);
      const rev = changedKeys.includes('reverse_alarm') ? newSettings.reverse_alarm : (this.getSetting('reverse_alarm') || false);
      if (this._invertedByDefault) {
        this._invertContact = !(inv || rev);
        this._userExplicitInvert = false;
      } else {
        this._invertContact = inv || rev;
        this._userExplicitInvert = this._invertContact;
      }
      const current = this.getCapabilityValue('alarm_contact');
      if (current !== null) {
        const newValue = !current;
        await super.setCapabilityValue('alarm_contact', newValue).catch(() => { });
        if (this._contactState) {
          if (this._invertedByDefault) {
            this._contactState.confirmedValue = null;
            this._contactState.lastValue = null;
          } else {
            this._contactState.confirmedValue = newValue;
            this._contactState.lastValue = newValue;
            this._contactState.lastChangeTime = Date.now();
          }
        }
      }
    }
    if (super.onSettings) {
      await super.onSettings({ oldSettings, newSettings, changedKeys }).catch(e => this.error('[CONTACT] super.onSettings error:', e.message));
    }
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'alarm_contact') {
      const isIAS = this._iasOriginatedAlarm;
      this._iasOriginatedAlarm = false;

      const shouldInvert = isIAS ? false : (this._userExplicitInvert || this._invertContact);
      let finalValue = shouldInvert ? !value : value;

      const now = Date.now();
      const state = this._contactState || { lastValue: null, lastChangeTime: 0, timer: null };

      if (state.confirmedValue === finalValue) {
        state.lastIASTime = now;
        state.iasMessageCount++;
        if (state.iasMessageCount % 10 === 1) {
          this.log(`[CONTACT] Keep-alive detected (count: ${state.iasMessageCount}, value unchanged: ${finalValue})`);
        }
        return;
      }

      const timeSinceLastChange = now - state.lastChangeTime;

      if (state.lastValue !== null && timeSinceLastChange < this._debounceMs) {
        if (state.timer) this.homey.clearTimeout(state.timer);
        state.timer = this.homey.setTimeout(async () => {
          this.log(`[CONTACT] Debounce complete - applying: ${finalValue}`);
          state.lastValue = finalValue;
          state.confirmedValue = finalValue;
          state.lastChangeTime = Date.now();
          state.iasMessageCount = 0;
          await super.setCapabilityValue(capability, finalValue).catch(() => { });
        }, this._debounceMs);
        return;
      }

      if (this._isProblematicSensor && state.confirmedValue !== null) {
        if (state.confirmedValue === true && finalValue === false) {
          const keepAliveWindow = timeSinceLastChange >= DEBOUNCE.KEEP_ALIVE_MIN_MS && timeSinceLastChange <= DEBOUNCE.KEEP_ALIVE_MAX_MS;
          if (keepAliveWindow) {
            this.log(`[CONTACT] BLOCKED: Likely 1-hour keep-alive false "closed"`);
            return;
          }
          if (state.timer) this.homey.clearTimeout(state.timer);
          state.timer = this.homey.setTimeout(async () => {
            this.log(`[CONTACT] Extended debounce complete - applying: ${finalValue}`);
            state.lastValue = finalValue;
            state.confirmedValue = finalValue;
            state.lastChangeTime = Date.now();
            state.iasMessageCount = 0;
            await super.setCapabilityValue(capability, finalValue).catch(() => { });
          }, safeMultiply(this._debounceMs, 2));
          return;
        }
      }

      this.log(`[CONTACT] State change: ${state.confirmedValue} -> ${finalValue}`);
      state.lastValue = finalValue;
      state.confirmedValue = finalValue;
      state.lastChangeTime = now;
      state.iasMessageCount = 0;

      if (state.timer) {
        this.homey.clearTimeout(state.timer);
        state.timer = null;
      }

      return super.setCapabilityValue(capability, finalValue);
    }
    return super.setCapabilityValue(capability, value);
  }

  async _handleBatteryUpdate(value) {
    const now = Date.now();
    if (this._lastBatteryReportTime && (now - this._lastBatteryReportTime) < BATTERY_THROTTLE_MS) return;
    this._lastBatteryReportTime = now;
    const battery = Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, value));
    await super.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
  }

  async onUninit() {
    if (this._contactState?.timer) {
      this.homey.clearTimeout(this._contactState.timer);
      this._contactState.timer = null;
    }
    if (super.onUninit) await super.onUninit();
  }

  async onDeleted() {
    if (this._contactState?.timer) {
      this.homey.clearTimeout(this._contactState.timer);
      this._contactState.timer = null;
    }
    await super.onDeleted?.();
  }

  async onEndDeviceAnnounce() {
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    if (this._dataRecoveryManager) this._dataRecoveryManager.triggerRecovery();
  }
}

module.exports = ContactSensorDevice;

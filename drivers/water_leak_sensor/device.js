'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { startsWithCI, normalize } = require('../../lib/utils/CaseInsensitiveMatcher');
const { boolean } = require('../../lib/converters/ValueConverterRegistry');
const IASAlarmFallback = require('../../lib/IASAlarmFallback');
const IASZoneManager = require('../../lib/managers/IASZoneManager');
const { getModelId, getManufacturer } = require('../../lib/helpers/DeviceDataHelper');

/**
 * Water leak sensor — IAS Zone (TS0207) + selective Tuya DP (TS0601) profiles.
 *
 * Sacred couple example: `_TZ3000_k4ej3ww2` + `TS0207` → IAS only (never EF00 tuya water driver).
 * See data/user-misattribution-registry.json + reports/P151_*.
 *
 * Known quirks: HOBEIAN INVALID_EP bind on sleepy devices; some units use alarm2 vs alarm1;
 * batteryPercentageRemaining often 0–200; passive until wet/dry.
 */

const WATER_SENSOR_PROFILES = {
  '_TZE200_qq9mpfhw': {
    type: 'tuya_dp', productId: 'TS0601',
    dpMappings: { 1: 'alarm_water', 4: 'measure_battery' },
    notes: 'Tuya DP water sensor with temperature'
  },
  '_TZE200_jthf7vb6': {
    type: 'tuya_dp', productId: 'TS0601',
    dpMappings: { 1: 'alarm_water', 4: 'measure_battery' },
    invertRawAlarm: true,
    notes: 'Smart water leak alarm (forum request)'
  },
  '_TZE204_qq9mpfhw': {
    type: 'tuya_dp', productId: 'TS0601',
    dpMappings: { 1: 'alarm_water', 4: 'measure_battery', 2: 'measure_temperature' },
    notes: 'Tuya DP water sensor v2 with temperature'
  },
  '_TYST11_qq9mpfhw': {
    type: 'tuya_dp', productId: 'TS0601',
    dpMappings: { 1: 'alarm_water', 15: 'measure_battery' },
    notes: 'Legacy Tuya water sensor'
  },
  '_TZ3000_k4ej3ww2': {
    type: 'ias_zone', productId: 'TS0207', brand: 'HOBEIAN',
    model: 'ZG-222Z/ZG-222ZA',
    iasAlarmBit: 'both',
    hasTamper: true,
    notes: 'HOBEIAN/Aubess IAS water leak — sacred couple; never EF00 tuya driver'
  },
  '_tz3000_k4ej3ww2': {
    type: 'ias_zone', productId: 'TS0207', brand: 'HOBEIAN',
    model: 'ZG-222Z/ZG-222ZA',
    iasAlarmBit: 'both',
    hasTamper: true,
    notes: 'case variant of _TZ3000_k4ej3ww2'
  },
  '_TZ3000_K4EJ3WW2': {
    type: 'ias_zone', productId: 'TS0207', brand: 'HOBEIAN',
    model: 'ZG-222Z/ZG-222ZA',
    iasAlarmBit: 'both',
    hasTamper: true,
    notes: 'case variant of _TZ3000_k4ej3ww2'
  },
  '_TZ3000_85czd6fy': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: true,
    notes: 'Tuya water leak with tamper sensor'
  },
  '_TZ3000_upgcbody': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'both',
    hasTamper: false,
    notes: 'Standardized water leak detector'
  },
  '_TZ3000_kstbkt6a': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: true,
    notes: 'Standard Tuya water leak with tamper'
  },
  '_TZ3000_fvm13j8w': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    notes: 'Basic water leak sensor'
  },
  '_TZ3000_kyb656no': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    notes: 'Compact water leak sensor'
  },
  '_TZ3000_mugyhz0q': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    notes: 'Standard water leak'
  },
  '_TZ3000_t6jriawg': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'both',
    hasTamper: false,
    notes: 'Water leak - check both alarm bits'
  },
  '_TZ3000_js34cuma': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: true,
    notes: 'Water leak with tamper'
  },
  '_TZ3000_rurvxhcx': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    notes: 'Standard water leak'
  },
  'SONOFF': {
    type: 'ias_zone', productId: 'SNZB-05P',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    supportsOTA: true,
    notes: 'SONOFF SNZB-05P'
  },
  'eWeLink': {
    type: 'ias_zone', productId: 'SNZB-05P',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    supportsOTA: true,
    notes: 'eWeLink/SONOFF water leak sensor'
  },
  'HOBEIAN': {
    type: 'ias_zone', productId: 'ZG-222Z',
    iasAlarmBit: 'both',
    hasTamper: true,
    notes: 'HOBEIAN branded'
  },
  // P93: explicit lowercase alias — some interviews report manufacturerName as "hobeian"
  // (forum #2090/#2111 "no data" when profile match failed before IAS enroll)
  'hobeian': {
    type: 'ias_zone', productId: 'ZG-222Z',
    iasAlarmBit: 'both',
    hasTamper: true,
    notes: 'HOBEIAN branded (lowercase)'
  },
  'default': {
    type: 'hybrid',
    iasAlarmBit: 'both',
    hasTamper: true,
    notes: 'Unknown manufacturer - using hybrid mode'
  }
};

class WaterLeakSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_water', 'measure_battery', 'alarm_tamper'];
  }

  _getDeviceProfile() {
    const mfr = getManufacturer(this) || '';
    
    if (WATER_SENSOR_PROFILES[mfr]) {
      return { ...WATER_SENSOR_PROFILES[mfr], matchedBy: 'manufacturerName', mfr };
    }

    const mfrNorm = normalize(mfr);
    for (const [key, profile] of Object.entries(WATER_SENSOR_PROFILES)) {
      if (normalize(key) === mfrNorm) {
        return { ...profile, matchedBy: 'manufacturerName_lowercase', mfr };
      }
    }

    if (startsWithCI(mfr, '_tz3000_')) {
      return {
        ...WATER_SENSOR_PROFILES['default'],
        type: 'ias_zone',
        matchedBy: '_TZ3000_pattern',
        mfr
      };
    }

    if (startsWithCI(mfr, '_tze')) {
      return {
        ...WATER_SENSOR_PROFILES['default'],
        type: 'tuya_dp',
        matchedBy: '_TZE_pattern',
        mfr
      };
    }

    return { ...WATER_SENSOR_PROFILES['default'], matchedBy: 'default', mfr };
  }

  get dpMappings() {
    const alarmTransform = boolean();
    const transformAlarm = (value) => this._deviceProfile?.invertRawAlarm
      ? !alarmTransform(value)
      : alarmTransform(value);
    return {
      1: { capability: 'alarm_water', transform: transformAlarm },
      101: { capability: 'alarm_water', transform: boolean() },
      19: { capability: 'alarm_water', transform: boolean() },
      4: { capability: 'measure_battery', divisor: 1 },
      14: { capability: null, internal: 'battery_low', transform: boolean() },
      15: { capability: 'measure_battery', divisor: 1 },
      3: { capability: 'measure_battery', divisor: 1 },
      5: { capability: 'alarm_tamper', transform: boolean() },
      2: { capability: 'measure_temperature', smartDivisor: true },
      6: { capability: null, internal: 'battery_voltage' },
      9: { capability: null, setting: 'sensitivity' },
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this._deviceProfile = this._getDeviceProfile();
      // AlarmPolarityManager: curated lists + smart learn + setting (auto|normal|inverted)
      const { resolvePolarity } = require('../../lib/managers/AlarmPolarityManager');
      const pol = resolvePolarity(this, 'water');
      const userInv = !!this.getSetting('invert_alarm');
      // For DP path: mirror resolvePolarity.shouldInvert (lists/learn XOR checkbox)
      this._invertAlarm = !!pol.shouldInvert;
      this.log(`[WATER] polarity mode=${pol.mode} invert=${this._invertAlarm} reason=${pol.reason} userCheckbox=${userInv}`);
      await super.onNodeInit({ zclNode });

      // Forum #2134: Homey shows "-" for Sabotagealarm until first report —
      // seed false so UI is known (not "unknown").
      if (this.hasCapability('alarm_tamper') && this.getCapabilityValue('alarm_tamper') == null) {
        await this.safeSetCapabilityValue('alarm_tamper', false).catch(() => {});
      }
      if (this.hasCapability('alarm_water') && this.getCapabilityValue('alarm_water') == null) {
        await this.safeSetCapabilityValue('alarm_water', false).catch(() => {});
      }

      // IAS Zone enrollment
      try {
        const iasManager = new IASZoneManager(this);
        await iasManager.enrollIASZone();
      } catch (err) {
        this.log(`[WATER] IAS enrollment error (non-critical): ${err.message}`);
      }

      const profile = this._deviceProfile;
      this.log(
        `[WATER] ready mfr=${profile.mfr || 'unknown'} type=${profile.type || 'hybrid'} ` +
        `match=${profile.matchedBy || 'default'} ias=${profile.iasAlarmBit || 'both'} ` +
        `tamper=${!!profile.hasTamper} invert=${this._invertAlarm}`,
      );

      // Initialize IAS Alarm Fallback
      this._iasFallback = new IASAlarmFallback(this, {
        pollInterval: 6 * 60 * 60 * 1000,
        useTuyaMirror: true
      });
      await this._iasFallback.init().catch(e => {
        this.log(`[WATER] IAS Fallback init failed: ${e.message}`);
      });

      // Sleepy: do not force a second 5s IAS read at boot (e181bc15 timeouts).
      // Wake/rejoin path re-attaches listeners and reads while the node is up.
    }, 'onNodeInit');
  }

  /**
   * WHY: after an app update the IAS listener is gone; after sleep Homey
   * may still think the sensor is enrolled. Re-attach on every wake.
   * Skip the Tuya dataQuery parent path for IAS-only units.
   */
  async onEndDeviceAnnounce() {
    this.log('[WATER] wake/rejoin — re-attach IAS Zone listener');
    try {
      if (typeof this._reattachIasOnWake === 'function') {
        await this._reattachIasOnWake();
      } else {
        const iasManager = new IASZoneManager(this);
        await iasManager.enrollIASZone();
      }
    } catch (err) {
      this.log(`[WATER] IAS re-enroll on wake failed: ${err.message}`);
    }
    if (this._deviceProfile?.type === 'tuya_dp') {
      if (typeof super.onEndDeviceAnnounce === 'function') {
        await super.onEndDeviceAnnounce();
      }
      return;
    }
    try {
      await this._forceInitialAlarmRead(this.zclNode);
    } catch (_e) { /* sleepy read is best-effort */ }
    if (this._secondaryAlarmReadTimer) {
      try { this.homey.clearTimeout(this._secondaryAlarmReadTimer); } catch (_e) { /* ignore */ }
    }
    this._secondaryAlarmReadTimer = this.homey.setTimeout(async () => {
      this._secondaryAlarmReadTimer = null;
      if (this._destroyed) {return;}
      try {
        this.log('[WATER] Delayed secondary alarm read (5s post-wake)');
        await this._forceInitialAlarmRead(this.zclNode);
      } catch (e) {
        this.log(`[WATER] Secondary read failed: ${e.message}`);
      }
    }, 5000);
  }

  async _forceInitialAlarmRead(zclNode) {
    try {
      this.log('[WATER] Forcing initial alarm state read');
      const ep = zclNode?.endpoints?.[1];
      if (!ep) {return;}

      const iasCluster = ep.clusters?.iasZone || ep.clusters?.ssIasZone || ep.clusters?.[0x0500];
      if (iasCluster?.readAttributes) {
        try {
          const attrs = await Promise.race([
            iasCluster.readAttributes(['zoneStatus', 'zoneState']),
            new Promise((_, rej) => this.homey.setTimeout(() => { if (this._destroyed) {return;} rej(new Error('timeout')); }, 5000))
          ]);
          if (attrs?.zoneStatus !== undefined && typeof this._handleIASZoneStatus === 'function') {
            this._handleIASZoneStatus(attrs.zoneStatus);
          }
        } catch (e) {
          this.log(`[WATER] Initial IAS read failed: ${e.message}`);
        }
      }

      if (this._deviceProfile?.type === 'tuya_dp' || this._deviceProfile?.matchedBy?.includes('_TZE')) {
        try {
          const tuyaCluster = ep.clusters?.['tuya'] || ep.clusters?.[0xEF00] || ep.clusters?.[61184];
          if (tuyaCluster?.dataQuery) {
            await tuyaCluster.dataQuery({}).catch(() => { });
          }
        } catch (e) {
          this.log(`[WATER] ⚠️ Tuya DP query failed: ${e.message}`);
        }
      }
    } catch (e) {
      this.log(`[WATER] ⚠️ Force initial read error: ${e.message}`);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('alarm_polarity') || changedKeys.includes('invert_alarm')) {
      try {
        const { resetLearning } = require('../../lib/managers/AlarmPolarityManager');
        resetLearning(this);
      } catch (_e) { /* ignore */ }
    }
    if (changedKeys.includes('invert_alarm') || changedKeys.includes('alarm_polarity')) {
      const { resolvePolarity } = require('../../lib/managers/AlarmPolarityManager');
      // resolvePolarity reads getSetting — temporarily apply newSettings for resolve
      const prevGet = this.getSetting.bind(this);
      this.getSetting = (k) => (Object.prototype.hasOwnProperty.call(newSettings, k)
        ? newSettings[k]
        : prevGet(k));
      const pol = resolvePolarity(this, 'water');
      this.getSetting = prevGet;
      this._invertAlarm = !!pol.shouldInvert;
      this.log(`[WATER] Invert/polarity changed invert=${this._invertAlarm} reason=${pol.reason}`);
      const current = this.getCapabilityValue('alarm_water');
      if (current !== null && (changedKeys.includes('invert_alarm') || changedKeys.includes('alarm_polarity'))) {
        await super.setCapabilityValue('alarm_water', !current).catch(() => { });
      }
    }
    if (super.onSettings) {
      return super.onSettings({ oldSettings, newSettings, changedKeys });
    }
  }

  setCapabilityValue(capability, value) {
    if (capability === 'alarm_water') {
      const isIAS = this._iasOriginatedWaterAlarm;
      this._iasOriginatedWaterAlarm = false;
      if (this._invertAlarm && !isIAS) {
        const invertedValue = !value;
        this.log(`[WATER] 🔄 Inverting alarm: ${value} → ${invertedValue}`);
        return super.setCapabilityValue(capability, invertedValue);
      }
    }
    return super.setCapabilityValue(capability, value);
  }

  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    if (this._secondaryAlarmReadTimer) {
      this.homey.clearTimeout(this._secondaryAlarmReadTimer);
      this._secondaryAlarmReadTimer = null;
    }
    if (this._iasFallback) {
      this._iasFallback.destroy();
      this._iasFallback = null;
    }
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = WaterLeakSensorDevice;

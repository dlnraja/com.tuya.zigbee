'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { startsWithCI, normalize } = require('../../lib/utils/CaseInsensitiveMatcher');
const { boolean } = require('../../lib/converters/ValueConverterRegistry');
const IASAlarmFallback = require('../../lib/IASAlarmFallback');
const IASZoneManager = require('../../lib/managers/IASZoneManager');
const { getModelId, getManufacturer } = require('../../lib/helpers/DeviceDataHelper');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      WATER LEAK SENSOR - v5.5.803 FORUM #1166 LASSE_K FIX                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Sources:                                                                    ║
 * ║  - Zigbee2MQTT: TS0207_water_leak_detector, TS0601_water_sensor             ║
 * ║  - GitHub Issues: #28181 (HOBEIAN INVALID_EP), #24759 (upgcbody)            ║
 * ║  - ZHA, Hubitat community reports                                           ║
 * ║                                                                              ║
 * ║  DEVICE TYPES:                                                               ║
 * ║  1. TS0207 (IAS Zone 1280): _TZ3000_*, HOBEIAN, SONOFF SNZB-05P             ║
 * ║  2. TS0601 (Tuya DP 61184): _TZE200_qq9mpfhw, _TZE204_qq9mpfhw              ║
 * ║                                                                              ║
 * ║  KNOWN ISSUES FIXED:                                                         ║
 * ║  - Lasse_K #978: Some sensors use IAS alarm2 instead of alarm1              ║
 * ║  - Lasse_K #1166: Water sensor installs but no alarm (v5.5.803 fix)         ║
 * ║  - HOBEIAN #28181: INVALID_EP binding error (sleepy device timing)          ║
 * ║  - _TZ3000_85czd6fy: Tamper support added                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
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
    notes: 'HOBEIAN water leak'
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
      this._invertAlarm = this.getSetting('invert_alarm') || false;
      await super.onNodeInit({ zclNode });

      // IAS Zone enrollment
      try {
        const iasManager = new IASZoneManager(this);
        await iasManager.enrollIASZone();
      } catch (err) {
        this.log(`[WATER] ⚠️ IAS enrollment error (non-critical): ${err.message}`);
      }

      // Log device-specific info
      const profile = this._deviceProfile;
      this.log('╔══════════════════════════════════════════════════════════════╗');
      this.log('║          WATER LEAK SENSOR v5.5.803                          ║');
      this.log('╠══════════════════════════════════════════════════════════════╣');
      this.log(`║ Manufacturer: ${profile.mfr || 'unknown'}`);
      this.log(`║ Profile Type: ${profile.type || 'hybrid'}`);
      this.log(`║ Matched By:   ${profile.matchedBy || 'default'}`);
      this.log(`║ IAS Alarm:    ${profile.iasAlarmBit || 'both'}`);
      this.log(`║ Has Tamper:   ${profile.hasTamper ? 'YES' : 'NO'}`);
      this.log('╚══════════════════════════════════════════════════════════════╝');

      // Initialize IAS Alarm Fallback
      this._iasFallback = new IASAlarmFallback(this, {
        pollInterval: 30000,
        useTuyaMirror: true
      });
      await this._iasFallback.init().catch(e => {
        this.log(`[WATER] ⚠️ IAS Fallback init failed: ${e.message}`);
      });

      // Force initial alarm state read
      await this._forceInitialAlarmRead(zclNode);

      // Delayed secondary read for sleepy sensors
      this._secondaryAlarmReadTimer = this.homey.setTimeout(async () => {
        this._secondaryAlarmReadTimer = null;
        if (this._destroyed) return;
        try {
          this.log('[WATER] 📖 Delayed secondary alarm read (5s post-init)...');
          await this._forceInitialAlarmRead(zclNode);
        } catch (e) {
          this.log(`[WATER] ⚠️ Secondary read failed: ${e.message}`);
        }
      }, 5000);

      this.log(`[WATER] ✅ Water leak sensor ready (invert: ${this._invertAlarm})`);
    }, 'onNodeInit');
  }

  async _forceInitialAlarmRead(zclNode) {
    try {
      this.log('[WATER] 📖 Forcing initial alarm state read...');
      const ep = zclNode?.endpoints?.[1];
      if (!ep) {return;}

      const iasCluster = ep.clusters?.iasZone || ep.clusters?.ssIasZone || ep.clusters?.[0x0500];
      if (iasCluster?.readAttributes) {
        try {
          const attrs = await Promise.race([
            iasCluster.readAttributes(['zoneStatus', 'zoneState']),
            new Promise((_, rej) => this.homey.setTimeout(() => { if (this._destroyed) return; rej(new Error('timeout')); }, 5000))
          ]);
          if (attrs?.zoneStatus !== undefined && typeof this._handleIASZoneStatus === 'function') {
            this._handleIASZoneStatus(attrs.zoneStatus);
          }
        } catch (e) {
          this.log(`[WATER] ⚠️ Initial IAS read failed: ${e.message}`);
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
    if (changedKeys.includes('invert_alarm')) {
      this._invertAlarm = newSettings.invert_alarm;
      this.log(`[WATER] Invert setting changed to: ${this._invertAlarm}`);
      const current = this.getCapabilityValue('alarm_water');
      if (current !== null) {
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
    if (this._destroyed) return;
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

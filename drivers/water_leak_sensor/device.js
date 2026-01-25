'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');
const IASAlarmFallback = require('../../lib/IASAlarmFallback');
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

// ═══════════════════════════════════════════════════════════════════════════════
// v5.5.550: MANUFACTURER-SPECIFIC PROFILES (from Zigbee2MQTT research)
// ═══════════════════════════════════════════════════════════════════════════════
const WATER_SENSOR_PROFILES = {
  // ─────────────────────────────────────────────────────────────────────────────
  // TS0601 TUYA DP DEVICES (cluster 61184)
  // ─────────────────────────────────────────────────────────────────────────────
  '_TZE200_qq9mpfhw': {
    type: 'tuya_dp', productId: 'TS0601',
    dpMappings: { 1: 'alarm_water', 4: 'measure_battery' },
    notes: 'Tuya DP water sensor with temperature'
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

  // ─────────────────────────────────────────────────────────────────────────────
  // TS0207 IAS ZONE DEVICES (cluster 1280)
  // ─────────────────────────────────────────────────────────────────────────────
  '_TZ3000_k4ej3ww2': {
    type: 'ias_zone', productId: 'TS0207', brand: 'HOBEIAN',
    model: 'ZG-222Z/ZG-222ZA',
    iasAlarmBit: 'both', // Uses alarm1 OR alarm2
    hasTamper: true,
    knownIssues: ['INVALID_EP binding - GitHub #28181', 'Some units show null values'],
    notes: 'HOBEIAN water leak - may need re-pair if values are null'
  },
  '_TZ3000_85czd6fy': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'alarm1',
    hasTamper: true, // PR #6079 added tamper support
    notes: 'Tuya water leak with tamper sensor'
  },
  '_TZ3000_upgcbody': {
    type: 'ias_zone', productId: 'TS0207',
    iasAlarmBit: 'both',
    hasTamper: false,
    notes: 'GitHub #24759 - should be detected as water_leak_detector_1'
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
    iasAlarmBit: 'both', // Some report on alarm2
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

  // ─────────────────────────────────────────────────────────────────────────────
  // SONOFF DEVICES
  // ─────────────────────────────────────────────────────────────────────────────
  'SONOFF': {
    type: 'ias_zone', productId: 'SNZB-05P',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    supportsOTA: true,
    notes: 'SONOFF SNZB-05P - IAS Zone standard, OTA supported'
  },
  'eWeLink': {
    type: 'ias_zone', productId: 'SNZB-05P',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    supportsOTA: true,
    notes: 'eWeLink/SONOFF water leak sensor'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HOBEIAN DEVICES
  // ─────────────────────────────────────────────────────────────────────────────
  'HOBEIAN': {
    type: 'ias_zone', productId: 'ZG-222Z',
    iasAlarmBit: 'both',
    hasTamper: true,
    knownIssues: ['INVALID_EP binding possible'],
    notes: 'HOBEIAN branded - may need re-pair'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DEFAULT FALLBACK
  // ─────────────────────────────────────────────────────────────────────────────
  'default': {
    type: 'hybrid', // Try both IAS Zone and Tuya DP
    iasAlarmBit: 'both', // v5.5.549 fix: check both bits
    hasTamper: true,
    notes: 'Unknown manufacturer - using hybrid mode'
  }
};

class WaterLeakSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_water', 'measure_battery', 'alarm_tamper'];
  }

  /**
   * v5.5.550: Get manufacturer-specific profile
   */
  _getDeviceProfile() {
    // v5.5.735: Use DeviceDataHelper for consistent manufacturer/model retrieval
    const mfr = getManufacturer(this) || '';
    const modelId = getModelId(this) || '';

    // Try exact match first
    if (WATER_SENSOR_PROFILES[mfr]) {
      return { ...WATER_SENSOR_PROFILES[mfr], matchedBy: 'manufacturerName', mfr };
    }

    // Try lowercase match
    const mfrLower = mfr.toLowerCase();
    for (const [key, profile] of Object.entries(WATER_SENSOR_PROFILES)) {
      if (key.toLowerCase() === mfrLower) {
        return { ...profile, matchedBy: 'manufacturerName_lowercase', mfr };
      }
    }

    // Try partial match for _TZ3000_* pattern
    if (mfr.startsWith('_TZ3000_') || mfr.startsWith('_tz3000_')) {
      return {
        ...WATER_SENSOR_PROFILES['default'],
        type: 'ias_zone',
        matchedBy: '_TZ3000_pattern',
        mfr
      };
    }

    // Try partial match for _TZE* pattern (Tuya DP)
    if (mfr.startsWith('_TZE') || mfr.startsWith('_tze')) {
      return {
        ...WATER_SENSOR_PROFILES['default'],
        type: 'tuya_dp',
        matchedBy: '_TZE_pattern',
        mfr
      };
    }

    // Default fallback
    return { ...WATER_SENSOR_PROFILES['default'], matchedBy: 'default', mfr };
  }

  /**
   * v5.5.550: ENRICHED dpMappings based on device profile
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // WATER LEAK DETECTION (multiple DP variants)
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_water', transform: (v) => v === 1 || v === true || v === 'alarm' },
      101: { capability: 'alarm_water', transform: (v) => v === 1 || v === true },
      // Some _TZE204 devices use DP19 for water leak
      19: { capability: 'alarm_water', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (various DPs used by different manufacturers)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      15: { capability: 'measure_battery', divisor: 1 },
      // Some devices report battery on DP3
      3: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER DETECTION
      // ═══════════════════════════════════════════════════════════════════
      5: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // ADDITIONAL FEATURES
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_temperature', divisor: 10 },
      6: { capability: null, internal: 'battery_voltage' },
      9: { capability: null, setting: 'sensitivity' },
    };
  }

  async onNodeInit({ zclNode }) {
    // Get device profile before parent init
    this._deviceProfile = this._getDeviceProfile();

    // v5.5.713: Check for invert_alarm setting (Lasse_K forum fix)
    this._invertAlarm = this.getSetting('invert_alarm') || false;

    await super.onNodeInit({ zclNode });

    // Log device-specific info
    const profile = this._deviceProfile;
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║          WATER LEAK SENSOR v5.5.550                          ║');
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log(`║ Manufacturer: ${profile.mfr || 'unknown'}`);
    this.log(`║ Profile Type: ${profile.type || 'hybrid'}`);
    this.log(`║ Matched By:   ${profile.matchedBy || 'default'}`);
    this.log(`║ IAS Alarm:    ${profile.iasAlarmBit || 'both'}`);
    this.log(`║ Has Tamper:   ${profile.hasTamper ? 'YES' : 'NO'}`);
    if (profile.knownIssues) {
      this.log(`║ Known Issues: ${profile.knownIssues.join(', ')}`);
    }
    if (profile.notes) {
      this.log(`║ Notes:        ${profile.notes}`);
    }
    this.log('╚══════════════════════════════════════════════════════════════╝');
    this.log('');

    // Warn about known problematic devices
    if (profile.knownIssues && profile.knownIssues.length > 0) {
      this.log(`[WATER] ⚠️ Known issues for this device: ${profile.knownIssues.join(', ')}`);
    }

    // v5.5.803: FORUM #1166 FIX - Initialize IAS Alarm Fallback for ALL water leak sensors
    // Previously only enabled for IAS Zone type devices, but many sensors need this fallback
    // to ensure alarms are properly detected via polling when notifications fail
    this._iasFallback = new IASAlarmFallback(this, {
      pollInterval: 30000, // Poll every 30s for water leak detection
      useTuyaMirror: true
    });
    await this._iasFallback.init().catch(e => {
      this.log(`[WATER] ⚠️ IAS Fallback init failed: ${e.message}`);
    });
    this.log('[WATER] ✅ IAS Alarm Fallback enabled for ALL water sensors (v5.5.803)');

    // v5.5.803: FORUM #1166 FIX - Force initial alarm state read
    await this._forceInitialAlarmRead(zclNode);

    this.log(`[WATER] ✅ Water leak sensor ready (invert: ${this._invertAlarm})`);
  }

  /**
   * v5.5.803: FORUM #1166 FIX - Force initial alarm state read
   * Some water sensors don't send notifications, only respond to reads
   * This ensures we get the current state immediately after pairing
   */
  async _forceInitialAlarmRead(zclNode) {
    try {
      this.log('[WATER] 📖 Forcing initial alarm state read...');
      
      const ep = zclNode?.endpoints?.[1];
      if (!ep) {
        this.log('[WATER] ⚠️ No endpoint 1 for initial read');
        return;
      }

      // Try IAS Zone cluster first
      const iasCluster = ep.clusters?.iasZone || ep.clusters?.ssIasZone || ep.clusters?.[0x0500];
      if (iasCluster?.readAttributes) {
        try {
          const attrs = await Promise.race([
            iasCluster.readAttributes(['zoneStatus', 'zoneState']),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
          ]);
          
          this.log('[WATER] 📖 Initial IAS read:', JSON.stringify(attrs));
          
          if (attrs?.zoneStatus !== undefined) {
            const status = typeof attrs.zoneStatus === 'number' ? attrs.zoneStatus : 0;
            const alarm1 = (status & 0x01) > 0;
            const alarm2 = (status & 0x02) > 0;
            const waterDetected = alarm1 || alarm2;
            
            this.log(`[WATER] 📊 Initial status: 0x${status.toString(16)} → alarm1=${alarm1}, alarm2=${alarm2}, water=${waterDetected}`);
            
            // Set initial alarm state
            if (this.hasCapability('alarm_water')) {
              await this.setCapabilityValue('alarm_water', waterDetected).catch(() => {});
              this.log(`[WATER] ✅ Initial alarm_water set to: ${waterDetected}`);
            }
          }
        } catch (e) {
          this.log(`[WATER] ⚠️ Initial IAS read failed: ${e.message}`);
        }
      }

      // Also try Tuya DP query for TS0601 devices
      if (this._deviceProfile?.type === 'tuya_dp' || this._deviceProfile?.matchedBy?.includes('_TZE')) {
        try {
          const tuyaCluster = ep.clusters?.['tuya'] || ep.clusters?.[0xEF00] || ep.clusters?.[61184];
          if (tuyaCluster?.dataQuery) {
            await tuyaCluster.dataQuery({}).catch(() => {});
            this.log('[WATER] 📤 Sent Tuya DP query for initial state');
          }
        } catch (e) {
          this.log(`[WATER] ⚠️ Tuya DP query failed: ${e.message}`);
        }
      }
    } catch (e) {
      this.log(`[WATER] ⚠️ Force initial read error: ${e.message}`);
    }
  }

  /**
   * v5.5.713: Handle settings changes (Lasse_K forum fix)
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('invert_alarm')) {
      this._invertAlarm = newSettings.invert_alarm;
      this.log(`[WATER] Invert setting changed to: ${this._invertAlarm}`);
      // Toggle current state if inverted
      const current = this.getCapabilityValue('alarm_water');
      if (current !== null) {
        await this.setCapabilityValue('alarm_water', !current).catch(() => { });
      }
    }
    if (super.onSettings) {
      await super.onSettings({ oldSettings, newSettings, changedKeys });
    }
  }

  /**
   * v5.5.713: Override setCapabilityValue to apply inversion for alarm_water (Lasse_K forum fix)
   */
  async setCapabilityValue(capability, value) {
    if (capability === 'alarm_water' && this._invertAlarm) {
      const invertedValue = !value;
      this.log(`[WATER] 🔄 Inverting alarm: ${value} → ${invertedValue}`);
      return super.setCapabilityValue(capability, invertedValue);
    }
    return super.setCapabilityValue(capability, value);
  }

  async onDeleted() {
    if (this._iasFallback) {
      this._iasFallback.destroy();
    }
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = WaterLeakSensorDevice;

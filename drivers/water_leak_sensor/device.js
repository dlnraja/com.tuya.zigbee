'use strict';

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const IASAlarmFallback = require('../../lib/IASAlarmFallback');
const IASZoneManager = require('../../lib/managers/IASZoneManager');
const { getModelId, getManufacturer } = require('../../lib/helpers/DeviceDataHelper');
const { equalsCI, startsWithCI } = require('../../lib/utils/CaseInsensitiveMatcher.js');

/**
 * WATER LEAK SENSOR - v5.5.803
 */

const WATER_SENSOR_PROFILES = {
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
  'SONOFF': {
    type: 'ias_zone', productId: 'SNZB-05P',
    iasAlarmBit: 'alarm1',
    hasTamper: false,
    supportsOTA: true,
    notes: 'SONOFF SNZB-05P'
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
    
    for (const [key, profile] of Object.entries(WATER_SENSOR_PROFILES)) {
      if (equalsCI(key, mfr)) return { ...profile, mfr };
    }

    if (startsWithCI(mfr, '_tz3000_')) {
      return { ...WATER_SENSOR_PROFILES['default'], type: 'ias_zone', mfr };
    }

    if (startsWithCI(mfr, '_tze')) {
      return { ...WATER_SENSOR_PROFILES['default'], type: 'tuya_dp', mfr };
    }

    return { ...WATER_SENSOR_PROFILES['default'], mfr };
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_water', transform: (v) => !!v },
      101: { capability: 'alarm_water', transform: (v) => !!v },
      19: { capability: 'alarm_water', transform: (v) => !!v },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      3: { capability: 'measure_battery', divisor: 1 },
      5: { capability: 'alarm_tamper', transform: (v) => !!v },
      2: { capability: 'measure_temperature', divisor: 10 },
    };
  }

  async onNodeInit({ zclNode }) {
    this._deviceProfile = this._getDeviceProfile();
    this._invertAlarm = this.getSetting('invert_alarm') || false;

    await super.onNodeInit({ zclNode });

    try {
      const iasManager = new IASZoneManager(this);
      await iasManager.enrollIASZone();
    } catch (e) {
      this.log(`[WATER] IAS enrollment error: ${e.message}`);
    }

    this._iasFallback = new IASAlarmFallback(this, {
      pollInterval: 30000, 
      useTuyaMirror: true
    });
    await this._iasFallback.init().catch(e => {
      this.log(`[WATER] IAS Fallback init failed: ${e.message}`);
    });
    
    await this._forceInitialAlarmRead(zclNode);
    this.log(`[WATER] Water leak sensor ready`);
  }

  async _forceInitialAlarmRead(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      if (!ep) return;

      const iasCluster = ep.clusters?.iasZone || ep.clusters?.ssIasZone;
      if (iasCluster?.readAttributes) {
        try {
          const attrs = await Promise.race([
            iasCluster.readAttributes(['zoneStatus', 'zoneState']),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
          ]);
          if (attrs?.zoneStatus !== undefined && typeof this._handleIASZoneStatus === 'function') {
            this._handleIASZoneStatus(attrs.zoneStatus);
          }
        } catch (e) {
          this.log(`[WATER] Initial IAS read failed: ${e.message}`);
        }
      }
    } catch (e) {
      this.log(`[WATER] Force initial read error: ${e.message}`);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('invert_alarm')) {
      this._invertAlarm = newSettings.invert_alarm;
    }
    return super.onSettings({ oldSettings, newSettings, changedKeys });
  }

  async onDeleted() {
    if (this._iasFallback) this._iasFallback.destroy();
    return super.onDeleted();
  }
}

module.exports = WaterLeakSensorDevice;

'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * RADIATOR VALVE (TRV) ZIGBEE - v6.0
 * Comprehensive Zigbee TRV support with all features:
 * - Temperature control (target, local, calibration)
 * - Scheduler (weekly programs)
 * - Boost mode, eco mode, frost protection
 * - Window detection, child lock
 * - Battery monitoring
 * - Multi-manufacturer support (Tuya, Moes, Saswell, etc.)
 */

class RadiatorValveZigbeeDevice extends UnifiedThermostatBase {
  get supportsScheduler() { return true; }
  get supportsBoost() { return true; }
  get supportsEcoMode() { return true; }
  get supportsFrostProtection() { return true; }
  get supportsWindowDetection() { return true; }

  async onNodeInit({ zclNode }) {
    // --- Homey Time Sync for TRV/LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs:6 * 60 * 60 * 1000 });
      
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed:', e.message);
        }
      }, 10000);
      
      this._timeSyncInterval = this.homey.setInterval(async () => {
        try {
          const result = await this._timeSync.sync();
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Periodic sync failed:', e.message);
        }
      },6 * 60 * 60 * 1000);
    } catch (e) {
      this.log('[TimeSync] Time sync init failed:', e.message);
    }

    // --- Attribute Reporting Configuration ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured');
    } catch (err) {
      this.log('Attribute reporting failed:', err.message);
    }

    this.log('[TRV-ZIGBEE]  Initializing TRV...');

    this.dpMappings = {
      1: { capability: 'target_temperature', divisor: 10, dataType: 2 },
      2: { capability: 'measure_temperature', divisor: 10, dataType: 2 },
      3: { capability: 'onoff', dataType: 1 },
      4: { capability: 'thermostat_mode', dataType: 4 },
      5: { capability: 'measure_battery', divisor: 1, dataType: 2 },
      7: { capability: 'child_lock', dataType: 1 },
      8: { capability: 'window_detection', dataType: 1 },
      10: { capability: 'frost_protection_temperature', divisor: 10, dataType: 2 },
      16: { capability: 'target_temperature', divisor: 10, dataType: 2 },
      19: { capability: 'boost_mode', dataType: 1 },
      24: { capability: 'measure_temperature', divisor: 10, dataType: 2 },
      27: { capability: 'temperature_calibration', divisor: 10, dataType: 2 },
      28: { capability: 'eco_temperature', divisor: 10, dataType: 2 },
      31: { capability: 'valve_position', divisor: 1, dataType: 2 },
      36: { capability: 'schedule_monday', dataType: 3 },
      37: { capability: 'schedule_tuesday', dataType: 3 },
      38: { capability: 'schedule_wednesday', dataType: 3 },
      39: { capability: 'schedule_thursday', dataType: 3 },
      40: { capability: 'schedule_friday', dataType: 3 },
      41: { capability: 'schedule_saturday', dataType: 3 },
      42: { capability: 'schedule_sunday', dataType: 3 },
      101: { capability: 'child_lock', dataType: 1 },
      104: { capability: 'thermostat_mode', dataType: 4 }
    };

    this.registerCapabilityListener('target_temperature', this.onTargetTemperatureChange.bind(this));
    this.registerCapabilityListener('thermostat_mode', this.onModeChange.bind(this));
    
    if (this.hasCapability('boost_mode')) this.registerCapabilityListener('boost_mode', this.onBoostModeChange.bind(this));
    if (this.hasCapability('window_detection')) this.registerCapabilityListener('window_detection', this.onWindowDetectionChange.bind(this));
    if (this.hasCapability('child_lock')) this.registerCapabilityListener('child_lock', this.onChildLockChange.bind(this));

    this.log('[TRV-ZIGBEE]  TRV initialized');
  }

  async onTargetTemperatureChange(value) {
    this.log(`[TRV-ZIGBEE] Setting target temp: ${value}`);
    try {
      await this.sendTuyaDPCommand(1, Math.round(value * 10));
      return true;
    } catch (e1) {
      try {
        await this.sendTuyaDPCommand(16, Math.round(value * 10));
        return true;
      } catch (e2) {
        this.error('[TRV-ZIGBEE] Failed to set target temp:', e2.message);
        throw e2;
      }
    }
  }

  async onModeChange(mode) {
    const modeMap = { 'auto': 0, 'manual': 1, 'eco': 2, 'boost': 3, 'away': 4, 'off': 5 };
    const dpValue = modeMap[mode] !== undefined ? modeMap[mode] : 1;
    try {
      await this.sendTuyaDPCommand(4, dpValue, 4);
      return true;
    } catch (e1) {
      try {
        await this.sendTuyaDPCommand(104, dpValue, 4);
        return true;
      } catch (e2) {
        this.error('[TRV-ZIGBEE] Failed to set mode:', e2.message);
        throw e2;
      }
    }
  }

  async onBoostModeChange(value) { await this.sendTuyaDPCommand(19, value, 1); }
  async onWindowDetectionChange(value) { await this.sendTuyaDPCommand(8, value, 1); }
  async onChildLockChange(value) {
    try { await this.sendTuyaDPCommand(7, value, 1); }
    catch (e) { await this.sendTuyaDPCommand(101, value, 1); }
  }

  async setSchedule(day, schedule) {
    const dayDPs = { 'monday': 36, 'tuesday': 37, 'wednesday': 38, 'thursday': 39, 'friday': 40, 'saturday': 41, 'sunday': 42 };
    const dp = dayDPs[day.toLowerCase()];
    if (!dp) throw new Error('Invalid day');
    await this.sendTuyaDPCommand(dp, schedule, 3);
  }

  async onDeleted() {
    if (this._timeSyncInterval) this.homey.clearInterval(this._timeSyncInterval);
    this.log('TRV deleted');
  }

  async _tuyaTimeSyncFallback() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) return;
      const now = new Date();
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay()
      ]);
      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload });
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
  }
}

module.exports = RadiatorValveZigbeeDevice;

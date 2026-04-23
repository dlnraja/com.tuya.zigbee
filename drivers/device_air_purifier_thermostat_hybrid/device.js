'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');

/**
 * 
 *       (THERMOSTAT / TRV) - v5.5.129 FIXED (extends UnifiedThermostatBase)       
 * 
 *   UnifiedThermostatBase handles: target_temperature listener, ZCL Thermostat  
 *   This class ONLY: dpMappings                                                
 *   DPs: 1-9,13-17,24,35,36,101 | ZCL: 513,516,1,EF00                         
 *   Variants: Beca, Beok, Moes, AVATTO TRV, Saswell                           
 * 
 */
class ThermostatTuyaDPDevice extends UnifiedThermostatBase {

  get mainsPowered() { return false; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === true || v === 1 },
      2: { capability: 'target_temperature', divisor: 10 },
      3: { capability: 'measure_temperature', divisor: 10 },
      4: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'auto', 1: 'heat', 2: 'off', 3: 'eco', 4: 'boost' }[v] || 'auto') },
      5: { capability: 'eco_mode', transform: (v) => v === true || v === 1 },
      6: { capability: 'alarm_contact', transform: (v) => v === true || v === 1 },
      7: { capability: 'child_lock', transform: (v) => v === true || v === 1 },
      8: { capability: 'valve_position', divisor: 1 },
      9: { capability: 'boost_mode', transform: (v) => v === true || v === 1 },
      10: { internal: true, type: 'sound', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      14: { internal: true, type: 'min_temp', divisor: 10 },
      15: { internal: true, type: 'max_temp', divisor: 10 },
      16: { capability: 'target_temperature', divisor: 2 },
      17: { internal: true, type: 'deadzone', divisor: 10 },
      24: { capability: 'target_temperature', divisor: 2 },
      35: { capability: 'measure_humidity', divisor: 1 },
      36: { capability: 'heating', transform: (v) => v === 1 || v === true },
      101: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === 'low' } // SDK3: alarm_battery obsolÃ¨te
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Homey Time Sync for TRV/LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    // Uses ZCL Time Cluster (0x000A) or Tuya EF00 DP 0x24 as fallback.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs:6 * 60 * 60 * 1000 });
      
      // Initial sync after 10 seconds (let device settle)
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (result.success) {
            this.log('[TimeSync] Initial time sync successful');
          } else if (result.reason === 'no_rtc') {
            // Try Tuya EF00 DP 0x24 fallback for non-ZCL devices
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed (non-critical):', e.message);
        }
      }, 10000);
      
      // Periodic sync every 6 hours
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
      this.log('[TimeSync] Time sync init failed (non-critical):', e.message);
    }

    // --- Attribute Reporting Configuration (auto-generated) ---
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
        },
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // Parent handles ALL: target_temperature listener, ZCL Thermostat
    await super.onNodeInit({ zclNode });
    this.log('[THERMOSTAT] v5.5.129 - DPs: 1-9,13-17,24,35,36,101 | ZCL: 513,516,1,EF00');
    this.log('[THERMOSTAT]  Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * Tuya EF00 time sync fallback (DP (0x24 / decimal) 36)
   * Sends current time with timezone offset for Tuya-native (thermostat / TRV) devices.
   */
  async _tuyaTimeSyncFallback() {
    try {
      const node = this.zclNode || this._zclNode;
      const tuyaCluster = node?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) return;

      const now = new Date();
      let utcOffset = 0;
      try {
        const tz = this.homey.clock.getTimezone();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        utcOffset = Math.round((tzDate - now) / 3600000);
      } catch (e) { /* use UTC */ }

      // Tuya time format: [year-2000, month, day, hour, minute, second, weekday(0=Mon)]
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours() + utcOffset,
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay() // Sunday=7 in Tuya format
      ]);

      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload }); // Raw type
      this.log('[TimeSync] Tuya DP36 time sync sent:', payload.toString('hex'));
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }


  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = ThermostatTuyaDPDevice;


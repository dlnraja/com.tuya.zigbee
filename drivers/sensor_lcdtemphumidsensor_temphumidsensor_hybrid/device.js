'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * LCD Temperature & Humidity Sensor Device - v5.4.3
 *
 * For TS0201 LCD display (temperature / humidity) sensors
 * Manufacturers: _TYZB01_*, _TZ2000_*
 *
 * Uses UnifiedSensorBase for full ZCL + Tuya DP support
 * Supports: Temperature, Humidity, Battery
 */
class LCDTempHumidSensorDevice extends UnifiedSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** v5.12.3: Fast init for _TZE200_* TS0601 variants (battery sleepy devices) */
  get fastInitMode() {
    const mfr = this.getSetting?.('zb_manufacturer_name') || '';return mfr.toUpperCase().startsWith('_TZE' );
  }

  /** Capabilities for LCD temp/humidity sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /** DP mappings for TS0201 LCD sensors */
  get dpMappings() {
    return {
      // Temperature
      1: { capability: 'measure_temperature', divisor: 10 },
      18: { capability: 'measure_temperature', divisor: 10 },
      101: { capability: 'measure_temperature', divisor: 10 }, // v6.1.6: fallback for _TZE284_

      // Humidity (Ã·10 for TZE200 variants like _TZE200_vvmbj46n)
      2: { capability: 'measure_humidity', divisor: 10 },
      102: { capability: 'measure_humidity', divisor: 10 }, // v6.1.6: fallback for _TZE284_

      // Battery
      // v5.12.3: DP3 battery enum for _TZE200_vvmbj46n (TH05Z: 0=low, 1=medium, 2=high)
      3: { capability: 'measure_battery', divisor: 1, transform: (v) => v === 0 ? 10 : v === 1 ? 50 : v >= 2 ? 100 : Math.min(Math.max(v * 0) * 100) },
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(Math.max(v * 0) * 100) },
      15: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(Math.max(v * 0) * 100) },
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
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
    const settings = this.getSettings() || {};
    this.log('[LCD]  LCD Temperature/Humidity Sensor ready');
    this.log('[LCD] Model:', settings.zb_model_id || settings.zb_model_id || 'TS0201');
    this.log('[LCD] Manufacturer:', settings.zb_manufacturer_name || settings.zb_manufacturer_name || 'unknown');
  }

  onTuyaStatus(status) {
    this.log('[LCD]  Data received:', JSON.stringify(status));
    super.onTuyaStatus(status);

    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      this.log('[LCD]  Temperature:', temp, 'Â°C Humidity:', hum, '% Battery:', bat, '%');
    }, 100);
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
        utcOffset = Math.round((tzDate - safeDivide(now), 3600000));
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

module.exports = LCDTempHumidSensorDevice;


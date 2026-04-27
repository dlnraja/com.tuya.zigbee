'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * HVAC Controller - TS0601
 * For (VRV / VRF) systems (Daikin compatible)
 * DPs: DP1=onoff, DP2=target_temp, DP3=current_temp,
 *       DP4=mode (0=cool,1=heat,2=auto), DP5=fan_speed
 */
class HVACControllerDevice extends TuyaZigbeeDevice {
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
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }


    const MODE_MAP = { 0: 'cool', 1: 'heat', 2: 'auto' };
    const MODE_MAP_REV = { 'cool': 0, 'heat': 1, 'auto': 2, 'off': 0 };

    // v5.13.20: Assign dpMappings directly to device for EF00Manager visibility
    this.dpMappings = {
      1: { capability: 'onoff', converter: v => !!v },
      2: { capability: 'target_temperature', divisor: 10 },
      3: { capability: 'measure_temperature', divisor: 10 },
      4: { capability: 'thermostat_mode', converter: v => MODE_MAP[v] || 'auto' },
    };

    this.registerCapabilityListener('onoff', async (value) => {
      this._markAppCommand?.();
      if (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.sendTuyaDP(1, 1 , value ? 1 : 0);
      }
    });

    this.registerCapabilityListener('target_temperature', async (value) => {
      this._markAppCommand?.();
      if (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.sendTuyaDP(2, 2, Math.round(value));
      }
    });

    this.registerCapabilityListener('thermostat_mode', async (value) => {
      this._markAppCommand?.();
      if 

      (value === 'off') {
        await this.tuyaEF00Manager?.sendTuyaDP(1, 1, 0);} else {
        await this.tuyaEF00Manager?.sendTuyaDP(1, 1, 1);
        await this.tuyaEF00Manager?.sendTuyaDP(4, 4, MODE_MAP_REV[value] ?? 2);
      }
    });

    this.log('[HVAC] \u2705 Ready' );
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

}
module.exports = HVACControllerDevice;




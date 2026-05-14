'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');

const MODE_MAP = { 0: 'cool', 1: 'heat', 2: 'auto' };
const MODE_MAP_REV = { 'cool': 0, 'heat': 1, 'auto': 2, 'off': 0 };

/**
 * HVAC Controller - TS0601
 * For VRV/VRF systems
 */
class HVACControllerDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[HVAC] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    // 1. Time Sync (6h interval)
    try {
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs: 6 * 60 * 60 * 1000 });
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
      }, 6 * 60 * 60 * 1000);
    } catch (e) {
      this.log('[TimeSync] Init failed:', e.message);
    }

    // 2. DP Mappings
    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'onoff', converter: v => !!v },
        2: { capability: 'target_temperature', divisor: 10 },
        3: { capability: 'measure_temperature', divisor: 10 },
        4: { capability: 'thermostat_mode', converter: v => MODE_MAP[v] || 'auto' },
      };
    }

    // 3. Capability Listeners
    this.registerCapabilityListener('onoff', async (value) => {
      return this.sendTuyaCommand(1, value ? 1 : 0, 'bool');
    });

    this.registerCapabilityListener('target_temperature', async (value) => {
      return this.sendTuyaCommand(2, Math.round(value * 10), 'value');
    });

    this.registerCapabilityListener('thermostat_mode', async (value) => {
      if (value === 'off') {
        return this.sendTuyaCommand(1, 0, 'bool');
      } else {
        await this.sendTuyaCommand(1, 1, 'bool');
        return this.sendTuyaCommand(4, MODE_MAP_REV[value] ?? 2, 'enum');
      }
    });

    this.log('[HVAC] ✅ Ready');
  }

  onUninit() {
    if (this._timeSyncInterval) {
      this.homey.clearInterval(this._timeSyncInterval);
    }
    super.onUninit();
  }

  /**
   * Tuya EF00 time sync fallback (DP 36)
   */
  async _tuyaTimeSyncFallback() {
    try {
      const tuyaCluster = this.zclNode.endpoints[1].clusters.tuya;
      if (!tuyaCluster) return;

      const now = new Date();
      let utcOffset = 0;
      try {
        const tz = this.homey.clock.getTimezone();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        utcOffset = Math.round((tzDate - now) / 3600000);
      } catch (e) { /* use UTC */ }

      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours() + utcOffset,
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay()
      ]);

      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload });
      this.log('[TimeSync] Tuya DP36 sync sent');
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }

}

module.exports = HVACControllerDevice;

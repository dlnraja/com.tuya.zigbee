'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');

const MODE_MAP = { 0: 'auto', 1: 'heat', 2: 'off' };
const MODE_MAP_REV = { 'auto': 0, 'heat': 1, 'off': 2 };

/**
 * Smart LCD Thermostat - TS0601
 */
class SmartLCDThermostatDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[LCD-Thermo] 🚀 Initializing hardened driver...');
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
        1: { capability: 'thermostat_mode', converter: v => MODE_MAP[v] || 'auto' },
        2: { capability: 'target_temperature', divisor: 10 },
        3: { capability: 'measure_temperature', divisor: 10 },
        4: { capability: 'measure_humidity', divisor: 1 },
      };
    }

    // 3. Capability Listeners
    this.registerCapabilityListener('target_temperature', async (value) => {
      return this.sendTuyaCommand(2, Math.round(value * 10), 'value');
    });

    this.registerCapabilityListener('thermostat_mode', async (value) => {
      return this.sendTuyaCommand(1, MODE_MAP_REV[value] ?? 0, 'enum');
    });

    this.log('[LCD-Thermo] ✅ Ready');
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

module.exports = SmartLCDThermostatDevice;

'use strict';

/**
 * TuyaTimeSyncEngine - Critical for Tuya devices that wait for time sync
 * Many Tuya sensors won't report until they receive time sync
 * @version 5.5.670
 */

class TuyaTimeSyncEngine {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
    this._synced = false;
  }

  async syncTime(zclNode) {
    this.log('[TIME-SYNC] Starting time synchronization...');
    
    try {
      const ep = zclNode?.endpoints?.[1] || Object.values(zclNode?.endpoints || {})[0];
      if (!ep) return false;

      // Try Tuya cluster time sync (0xEF00)
      const tuyaCluster = ep.clusters?.[0xEF00] || ep.clusters?.['61184'];
      if (tuyaCluster) {
        await this._sendTuyaTimeSync(tuyaCluster);
        this._synced = true;
        return true;
      }

      // Try standard ZCL time cluster
      const timeCluster = ep.clusters?.time || ep.clusters?.[10];
      if (timeCluster) {
        await this._sendZclTimeSync(timeCluster);
        this._synced = true;
        return true;
      }

      this.log('[TIME-SYNC] No time cluster found');
      return false;
    } catch (err) {
      this.log('[TIME-SYNC] Failed:', err.message);
      return false;
    }
  }

  async _sendTuyaTimeSync(cluster) {
    const now = Math.floor(Date.now() / 1000);
    const utcTime = now;
    const localTime = now + (new Date().getTimezoneOffset() * -60);
    
    const payload = Buffer.alloc(8);
    payload.writeUInt32BE(utcTime, 0);
    payload.writeUInt32BE(localTime, 4);

    try {
      await cluster.writeAttributes({ timeSyncCmd: payload });
      this.log('[TIME-SYNC] ✅ Tuya time sync sent');
    } catch (e) {
      // Try alternate command
      try {
        await cluster.command('mcuSyncTime', { payload });
        this.log('[TIME-SYNC] ✅ Tuya mcuSyncTime sent');
      } catch (e2) {
        this.log('[TIME-SYNC] Commands failed, device may still work');
      }
    }
  }

  async _sendZclTimeSync(cluster) {
    const now = Math.floor(Date.now() / 1000) - 946684800; // ZCL epoch
    try {
      await cluster.writeAttributes({ time: now, timeStatus: 0x02 });
      this.log('[TIME-SYNC] ✅ ZCL time sync sent');
    } catch (e) {
      this.log('[TIME-SYNC] ZCL write failed');
    }
  }

  get isSynced() { return this._synced; }
}

module.exports = TuyaTimeSyncEngine;

'use strict';

/**
 * GlobalTimeSyncEngine - Time sync for Tuya devices
 * @version 5.5.672
 */

class GlobalTimeSyncEngine {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
    this._lastSync = 0;
  }

  async syncTime(zclNode) {
    if (Date.now() - this._lastSync < 60000) return { skipped: true };
    
    this.log('[TIME] Syncing time...');
    try {
      const tuya = this._getTuyaCluster(zclNode);
      const payload = this._buildPayload();
      
      if (tuya?.mcuSyncTime) {
        await tuya.mcuSyncTime(payload);
      } else if (tuya?.dataReport) {
        await tuya.dataReport({ dp: 9, datatype: 4, data: Buffer.from(payload.utc.toString()) });
      }
      
      this._lastSync = Date.now();
      this.log('[TIME] ✅ Synced');
      return { success: true };
    } catch (e) {
      this.log('[TIME] ⚠️', e.message);
      return { success: false };
    }
  }

  _getTuyaCluster(zclNode) {
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      if (ep.clusters?.[61184] || ep.clusters?.tuya) {
        return ep.clusters[61184] || ep.clusters.tuya;
      }
    }
    return null;
  }

  _buildPayload() {
    const now = new Date();
    return {
      utc: Math.floor(now.getTime() / 1000),
      local: Math.floor(now.getTime() / 1000) + (now.getTimezoneOffset() * -60),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  setupListener(zclNode) {
    const tuya = this._getTuyaCluster(zclNode);
    if (tuya?.on) {
      tuya.on('mcuSyncTime', () => this.syncTime(zclNode));
      tuya.on('command', (cmd) => { if (cmd === 'mcuSyncTime') this.syncTime(zclNode); });
      this.log('[TIME] ✅ Listener setup for time requests');
    }
  }

  _getTimeCluster(zclNode) {
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      if (ep.clusters?.genTime || ep.clusters?.[10]) return ep.clusters.genTime || ep.clusters[10];
    }
    return null;
  }

  schedulePeriodicSync(zclNode, intervalMs = 3600000) {
    setInterval(() => this.syncTime(zclNode), intervalMs);
  }
}

module.exports = GlobalTimeSyncEngine;

'use strict';

const TUYA = 0xEF00, TIME = 0x000A, EPOCH = 946684800;

class GlobalTimeSyncEngine {
  constructor(device) {
    this.device = device;
    this.timers = [];
  }

  async init() {
    this.device.log('[TIME-ENGINE] Initializing...');
    await this.sync('join');
    this._schedule(15 * 60000, '15min');
    this._schedule(3600000, '1h');
    this._schedule(86400000, 'daily', true);
    this.device.log('[TIME-ENGINE] Ready');
  }

  async sync(reason) {
    this.device.log(`[TIME-ENGINE] Sync (${reason})`);
    return await this._syncTuya() || await this._syncZCL();
  }

  async _syncTuya() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      const c = ep?.clusters?.[TUYA] || ep?.clusters?.tuya;
      if (!c) return false;
      const buf = Buffer.alloc(8);
      const utc = Math.floor(Date.now() / 1000) - EPOCH;
      const tz = -new Date().getTimezoneOffset() * 60;
      buf.writeUInt32BE(utc, 0);
      buf.writeUInt32BE(utc + tz, 4);
      if (c.mcuSyncTime) await c.mcuSyncTime({ payloadSize: 8, payload: [...buf] });
      this.device.log('[TIME-ENGINE] Tuya OK');
      return true;
    } catch (e) { return false; }
  }

  async _syncZCL() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      const c = ep?.clusters?.time || ep?.clusters?.[TIME];
      if (!c?.writeAttributes) return false;
      const t = Math.floor((Date.now() - 946684800000) / 1000);
      const tz = -new Date().getTimezoneOffset() * 60;
      await c.writeAttributes({ time: t, localTime: t + tz, timeZone: tz });
      this.device.log('[TIME-ENGINE] ZCL OK');
      return true;
    } catch (e) { return false; }
  }

  _schedule(ms, label, repeat) {
    const fn = () => this.sync(label).catch(() => {});
    this.timers.push(repeat ? setInterval(fn, ms) : setTimeout(fn, ms));
  }

  destroy() {
    this.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  }
}

module.exports = GlobalTimeSyncEngine;

/**
 * TuyaMCUManager - v3.0.0 (P2472b)
 *
 * MCU negotiation for TS0601 / EF00 devices:
 * - Version query + store cache
 * - Magic packet wake
 * - Time-sync format guess (couple → MCUFormatDatabase → TuyaTimeSyncFormats)
 * - Heartbeat + soft re-sync on announce/rejoin (Z2M pattern 0s/5s/60s)
 * - Never throws
 */

'use strict';

const EventEmitter = require('events');

const RESYNC_DELAYS_MS = Object.freeze([0, 5_000, 60_000]);

class TuyaMCUManager extends EventEmitter {
  constructor(device) {
    super();
    this.device = device;
    this.mcuVersion = 'unknown';
    this.lastHeartbeat = 0;
    this.format = null;
    this._negotiated = false;
    this._attached = false;
    this._resyncTimers = [];
  }

  _log(...args) {
    try {
      (this.device?._boundLog || this.device?.log)?.('[MCU-MANAGER]', ...args);
    } catch (_e) { /* noop */ }
  }

  _endpoint() {
    return this.device.zclNode?.endpoints?.[1]
      || this.device.zclNode?.endpoints?.[2]
      || null;
  }

  _tuyaCluster() {
    const ep = this._endpoint();
    if (!ep?.clusters) {return null;}
    return ep.clusters.tuya
      || ep.clusters.tuyaManufacturer
      || ep.clusters.manuSpecificTuya
      || ep.clusters[0xEF00]
      || ep.clusters[61184]
      || null;
  }

  _deviceInfo(extra = {}) {
    const manufacturerName = this.device.getSetting?.('zb_manufacturer_name')
      || this.device.getData?.()?.manufacturerName
      || this.device.getStoreValue?.('manufacturerName')
      || '';
    const productId = this.device.getSetting?.('zb_model_id')
      || this.device.getData?.()?.productId
      || this.device.getData?.()?.modelId
      || this.device.getStoreValue?.('modelId')
      || '';
    return {
      manufacturerName,
      productId,
      modelId: productId,
      driverClass: this.device.driver?.manifest?.class || '',
      mcuVersion: this.mcuVersion,
      ...extra,
    };
  }

  /**
   * Attach MCU pipeline on EF00 devices: negotiate + schedule soft re-sync.
   * Idempotent. Never throws.
   */
  async attach(opts = {}) {
    try {
      if (this._attached && !opts.force) {return this;}
      this._attached = true;

      // Restore cached version from store
      try {
        const cached = this.device.getStoreValue?.('mcu_version');
        if (cached) {this.mcuVersion = String(cached);}
      } catch (_e) { /* soft */ }

      await this.negotiate(opts);
      this.scheduleResync(opts);
      return this;
    } catch (err) {
      this._log('attach soft-fail:', err?.message || err);
      return this;
    }
  }

  /**
   * Send Magic Packet to wake MCU / start negotiation.
   */
  async sendMagicPacket() {
    try {
      const endpoint = this._endpoint();
      if (!endpoint) {return false;}

      this._log('Sending Magic Packet to negotiate protocol...');

      if (this.device.io?.magicHandshake) {
        const ok = await this.device.io.magicHandshake().catch(() => false);
        if (ok) {return true;}
      }

      const payload = Buffer.from([0x00, 0x01, 0x01]);
      if (typeof endpoint.sendFrame === 'function') {
        await endpoint.sendFrame(0xEF00, payload, { commandId: 0x00 }).catch(() => {});
        return true;
      }
      return false;
    } catch (err) {
      this._log('sendMagicPacket failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Negotiate MCU protocol version. Never throws.
   * @returns {Promise<string|null>} version string or null
   */
  async negotiateVersion(opts = {}) {
    try {
      await this.sendMagicPacket();

      const cluster = this._tuyaCluster();
      if (cluster) {
        try {
          const { configureMcuVersionRequest } = require('./MCUVersionHelper');
          await configureMcuVersionRequest(this.device, cluster, opts).catch(() => false);
        } catch (_e) { /* optional helper */ }

        try {
          const basic = this._endpoint()?.clusters?.basic;
          if (basic?.readAttributes) {
            const attrs = await basic.readAttributes(['appVersion', 'zclVersion']).catch(() => null);
            if (attrs?.appVersion != null) {
              this.mcuVersion = String(attrs.appVersion);
              this._negotiated = true;
              this._persistVersion();
              this._log('MCU version from Basic.appVersion:', this.mcuVersion);
              return this.mcuVersion;
            }
          }
        } catch (_e) { /* noop */ }
      }

      const ef00 = this.device.tuyaEF00Manager;
      if (ef00?.requestAllDPs) {
        await ef00.requestAllDPs(opts).catch(() => {});
      } else if (this.device.io?.queryAllDPs) {
        await this.device.io.queryAllDPs(opts).catch(() => {});
      }

      if (this.mcuVersion === 'unknown') {
        this.mcuVersion = 'v3.x-assumed';
      }
      this._negotiated = true;
      this.lastHeartbeat = Date.now();
      this._persistVersion();
      return this.mcuVersion;
    } catch (err) {
      this._log('negotiateVersion failed:', err?.message || err);
      return null;
    }
  }

  _persistVersion() {
    try {
      if (typeof this.device.setStoreValue === 'function' && this.mcuVersion) {
        this.device.setStoreValue('mcu_version', this.mcuVersion).catch(() => {});
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * Handle incoming MCU status frames.
   */
  handleStatus(frame) {
    this.lastHeartbeat = Date.now();
    try {
      if (frame && frame.version != null) {
        this.mcuVersion = String(frame.version);
        this._persistVersion();
      }
    } catch (_e) { /* noop */ }
  }

  /**
   * Heartbeat stamp — call from EF00 RX path.
   */
  touchHeartbeat() {
    this.lastHeartbeat = Date.now();
  }

  /**
   * Guess time-sync format: MCUFormatDatabase couple → TuyaTimeSyncFormats.guessFormat.
   */
  guessFormat(deviceInfo = {}) {
    try {
      const info = this._deviceInfo(deviceInfo);

      try {
        const MCUFormatDatabase = require('./MCUFormatDatabase');
        const lookup = MCUFormatDatabase.lookup?.(info)
          || MCUFormatDatabase.getByManufacturer?.(info.manufacturerName);
        if (lookup?.format) {
          this.format = lookup.format;
          return this.format;
        }
        if (typeof lookup === 'string') {
          this.format = lookup;
          return this.format;
        }
      } catch (_e) { /* fall through */ }

      let TuyaTimeSyncFormats;
      try { TuyaTimeSyncFormats = require('./TuyaTimeSyncFormats'); } catch (_e) {
        this.format = 'TUYA_DUAL_2000';
        return this.format;
      }
      if (!TuyaTimeSyncFormats?.guessFormat) {
        this.format = 'TUYA_DUAL_2000';
        return this.format;
      }
      const guess = TuyaTimeSyncFormats.guessFormat(info);
      this.format = (guess && guess.primary) ? guess.primary : (typeof guess === 'string' ? guess : 'TUYA_DUAL_2000');
      return this.format;
    } catch (_e) {
      this.format = 'TUYA_DUAL_2000';
      return this.format;
    }
  }

  /**
   * Ensure EF00 initialized then send time sync with guessed format + DP17 path.
   */
  async syncTime(opts = {}) {
    try {
      const ef00 = this.device.tuyaEF00Manager;
      const zclNode = opts.zclNode || this.device.zclNode;
      if (!ef00 || !zclNode) {return false;}

      if (typeof ef00.initialize === 'function' && !ef00._initialized) {
        await ef00.initialize(zclNode).catch(() => {});
      }

      const format = opts.timeFormat || this.guessFormat(opts.deviceInfo || {});
      const ok = await ef00.sendTimeSync(zclNode, {
        timeFormat: format,
        forceSync: opts.forceSync !== false,
        useFallbackChain: true,
        ...opts,
      });
      this.lastHeartbeat = Date.now();
      return !!ok;
    } catch (err) {
      this._log('syncTime soft-fail:', err?.message || err);
      return false;
    }
  }

  /**
   * Soft re-sync schedule (Z2M forceTimeUpdates pattern: 0s / 5s / 60s).
   */
  scheduleResync(opts = {}) {
    try {
      this.clearResync();
      const delays = Array.isArray(opts.delaysMs) ? opts.delaysMs : RESYNC_DELAYS_MS;
      const { safeSetTimeout } = require('../utils/safe-timers');
      for (const ms of delays) {
        const t = safeSetTimeout(this.device, () => {
          this.syncTime({ forceSync: true }).catch(() => {});
        }, ms);
        this._resyncTimers.push(t);
      }
    } catch (_e) {
      // WHY(P2472b CI): no bare setTimeout fallback — skip soft resync if safe-timers unavailable
      this._log('scheduleResync soft-skip (no safe-timers)');
    }
  }

  clearResync() {
    for (const t of this._resyncTimers) {
      try {
        if (typeof t === 'object' && t && typeof t.clear === 'function') {t.clear();}
        else clearTimeout(t);
      } catch (_e) { /* soft */ }
    }
    this._resyncTimers = [];
  }

  /**
   * Full negotiate: version query + format guess. Alias used by DeviceIOFacade.
   */
  async negotiate(opts = {}) {
    const version = await this.negotiateVersion(opts);
    const format = this.guessFormat(opts.deviceInfo || {});
    return { version: version || this.mcuVersion, format };
  }

  destroy() {
    this.clearResync();
    this._attached = false;
  }
}

module.exports = TuyaMCUManager;

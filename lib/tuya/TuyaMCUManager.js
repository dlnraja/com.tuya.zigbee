/**
 * TuyaMCUManager - v2.0.0 (P102)
 *
 * MCU negotiation for TS0601 / EF00 devices:
 * - Version query (cmd 0x00 / 0x01 variants)
 * - Magic packet wake
 * - Integrates with TuyaTimeSyncFormats.guessFormat
 */

'use strict';

const EventEmitter = require('events');

class TuyaMCUManager extends EventEmitter {
  constructor(device) {
    super();
    this.device = device;
    this.mcuVersion = 'unknown';
    this.lastHeartbeat = 0;
    this._negotiated = false;
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

  /**
   * Send Magic Packet to wake MCU / start negotiation.
   */
  async sendMagicPacket() {
    try {
      const endpoint = this._endpoint();
      if (!endpoint) {return false;}

      this._log('Sending Magic Packet to negotiate protocol...');

      // Prefer DeviceIOFacade / TuyaMagicPacket when available
      if (this.device.io?.magicHandshake) {
        const ok = await this.device.io.magicHandshake().catch(() => false);
        if (ok) {return true;}
      }

      // Command 0x00 query / 0x01 MCU version probe (best-effort raw)
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
      // P110: wire restored MCUVersionHelper (mcuVersionRequest 0x10 + dataQuery)
      if (cluster) {
        try {
          const { configureMcuVersionRequest } = require('./MCUVersionHelper');
          await configureMcuVersionRequest(this.device, cluster, opts).catch(() => false);
        } catch (_e) { /* optional helper */ }

        // Some firmwares expose appVersion via basic; EF00 may echo version in status
        try {
          const basic = this._endpoint()?.clusters?.basic;
          if (basic?.readAttributes) {
            const attrs = await basic.readAttributes(['appVersion', 'zclVersion']).catch(() => null);
            if (attrs?.appVersion != null) {
              this.mcuVersion = String(attrs.appVersion);
              this._negotiated = true;
              this._log('MCU version from Basic.appVersion:', this.mcuVersion);
              return this.mcuVersion;
            }
          }
        } catch (_e) { /* noop */ }
      }

      // Soft dataQuery via EF00 manager as negotiation stimulus
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
      return this.mcuVersion;
    } catch (err) {
      this._log('negotiateVersion failed:', err?.message || err);
      return null;
    }
  }

  /**
   * Handle incoming MCU status frames.
   */
  handleStatus(frame) {
    this.lastHeartbeat = Date.now();
    try {
      if (frame && frame.version != null) {
        this.mcuVersion = String(frame.version);
      }
    } catch (_e) { /* noop */ }
  }

  /**
   * Guess time-sync format via TuyaTimeSyncFormats (never hardcode a single format).
   */
  guessFormat(deviceInfo = {}) {
    try {
      let TuyaTimeSyncFormats;
      try { TuyaTimeSyncFormats = require('./TuyaTimeSyncFormats'); } catch (_e) { return 'TUYA_DUAL_2000'; }
      if (!TuyaTimeSyncFormats?.guessFormat) {return 'TUYA_DUAL_2000';}
      this.format = TuyaTimeSyncFormats.guessFormat({
        manufacturerName: this.device.getSetting?.('zb_manufacturer_name')
          || this.device.getData?.()?.manufacturerName,
        productId: this.device.getSetting?.('zb_model_id')
          || this.device.getData?.()?.modelId,
        ...deviceInfo,
      });
      return this.format;
    } catch (_e) {
      this.format = 'TUYA_DUAL_2000';
      return this.format;
    }
  }

  /**
   * Full negotiate: version query + format guess. Alias used by DeviceIOFacade.
   */
  async negotiate(opts = {}) {
    const version = await this.negotiateVersion(opts);
    const format = this.guessFormat(opts.deviceInfo || {});
    return { version: version || this.mcuVersion, format };
  }
}

module.exports = TuyaMCUManager;

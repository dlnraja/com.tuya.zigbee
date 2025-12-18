'use strict';

const TUYA_CLUSTER = 0xEF00;
const TUYA_TIME_CMD = 0x24;

// 1970 → 2000 delta
const EPOCH_2000_DELTA = 946684800;

class TuyaTimeManager {

  constructor(device) {
    this.device = device;
    this.lastSync = 0;
    this.retryTimer = null;
  }

  /**
   * Décide si on peut envoyer une synchro
   */
  canSync(minIntervalMs = 6 * 60 * 60 * 1000) { // 6h
    return Date.now() - this.lastSync > minIntervalMs;
  }

  /**
   * Envoi sécurisé avec retry
   */
  async sync({ useEpoch2000 = false, retries = 2, delayMs = 200 } = {}) {
    if (!this.canSync()) {
      this.device.log('[TuyaTime] Throttled');
      return;
    }

    this.lastSync = Date.now();

    for (let i = 0; i <= retries; i++) {
      await this._send(useEpoch2000);

      // second shot (MCU LCD requirement)
      if (i === 0) {
        await this._sleep(delayMs);
      }
    }
  }

  async _send(useEpoch2000) {
    const now = new Date();

    let utc = Math.floor(now.getTime() / 1000);
    if (useEpoch2000) utc -= EPOCH_2000_DELTA;

    const offset = -now.getTimezoneOffset() * 60;

    // Payload STRICT
    const payload = Buffer.alloc(10);
    payload.writeUInt8(0x00, 0);
    payload.writeUInt8(0x08, 1);
    payload.writeUInt32BE(utc, 2);
    payload.writeInt32BE(offset, 6);

    for (const epId of Object.keys(this.device.node.endpoints)) {
      const ep = this.device.getEndpoint(epId);
      if (ep?.clusters?.[TUYA_CLUSTER]) {
        await ep.sendFrame(TUYA_CLUSTER, TUYA_TIME_CMD, payload);
        this.device.log(`[TuyaTime] Sync sent EP${epId}`, payload.toString('hex'));
      }
    }
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = TuyaTimeManager;

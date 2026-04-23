'use strict';
const { safeMultiply } = require('./utils/tuyaUtils.js');

const { CLUSTERS } = require('./constants/ZigbeeConstants.js');


const TuyaSpecificCluster = require('./clusters/TuyaSpecificCluster');
const TUYA_CLUSTER = CLUSTERS.TUYA_EF00;
const TUYA_TIME_CMD = 0x24;

class TuyaTimeManager {

  constructor(device) {
    this.device = device;
    this.lastSync = 0;
    this.retryTimer = null;
  }

  /**
   * DÃ©cide si on peut envoyer une synchro
   */
  canSync(minIntervalMs =safeMultiply(6, 60) * 60 * 1000) { // 6h
    return Date.now() - this.lastSync > minIntervalMs;
  }

  /**
   * Envoi sÃ©curisÃ© avec retry
   */
  async sync({ retries = 2, delayMs = 200 } = {}) {
    if (!this.canSync()) {
      this.device.log('[TuyaTime] Throttled');
      return;
    }

    this.lastSync = Date.now();

    for (let i = 0; i <= retries; i++) {
      await this._send();

      // second shot (MCU LCD requirement)
      if (i === 0) {
        await this._sleep(delayMs);
      }
    }
  }

  async _send() {
    // v5.10.4: Manufacturer-aware epoch detection
    const mfr = this.device.getSetting?.('zb_manufacturer_name') || '';const ts = TuyaSpecificCluster.getTimestamps(mfr);
    const utc = ts.utc;
    const offset = ts.tz;

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




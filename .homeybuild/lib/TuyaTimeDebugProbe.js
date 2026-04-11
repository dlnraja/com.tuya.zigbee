'use strict';

class TuyaTimeDebugProbe {

  constructor(device, timeManager) {
    this.device = device;
    this.timeManager = timeManager;
    this.done = false;
  }

  async run() {
    if (this.done) return;
    this.done = true;

    this.device.log('[TuyaDebug] Starting time payload probe');

    const variants = [
      { epoch2000: false, extended: false },
      { epoch2000: true, extended: false },
      { epoch2000: false, extended: true },
      { epoch2000: true, extended: true },
    ];

    for (const v of variants) {
      this.device.log('[TuyaDebug] Trying', v);
      await this._sendVariant(v);
      await this._sleep(800);
    }

    this.device.log('[TuyaDebug] Probe finished');
  }

  async _sendVariant({ epoch2000, extended }) {
    const now = new Date();
    let utc = Math.floor(now.getTime() / 1000);
    if (epoch2000) utc -= 946684800;

    const offset = -now.getTimezoneOffset() * 60;

    const len = extended ? 0x0C : 0x08;
    const payload = Buffer.alloc(extended ? 14 : 10);

    payload.writeUInt8(0x00, 0);
    payload.writeUInt8(len, 1);
    payload.writeUInt32BE(utc, 2);
    payload.writeInt32BE(offset, 6);

    if (extended) {
      payload.writeUInt32BE(0x00000000, 10);
    }

    for (const epId in this.device.node.endpoints) {
      const ep = this.device.getEndpoint(epId);
      if (ep?.clusters?.[0xEF00]) {
        await ep.sendFrame(0xEF00, 0x24, payload);
      }
    }
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = TuyaTimeDebugProbe;

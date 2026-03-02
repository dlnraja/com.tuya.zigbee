'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class IRRemoteDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('[IR] Init Zigbee IR Remote');
    this._seq = 0;
    this._irMsg = null;
    this._learnBuf = null;
    try {
      const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
      const mdl = this.getSetting('zb_model_id') || this.getData()?.modelId || '';
      if (mfr) await this.setSettings({ zb_manufacturer_name: mfr }).catch(() => {});
      if (mdl) await this.setSettings({ zb_model_id: mdl }).catch(() => {});
    } catch (e) {}
    this._setupIR(zclNode);
    if (this.hasCapability('button.learn_ir'))
      this.registerCapabilityListener('button.learn_ir', () => this._startLearn());
    if (this.hasCapability('ir_send_code'))
      this.registerCapabilityListener('ir_send_code', (v) => this._sendIR(v));
    this.log('[IR] Ready');
  }

  _nextSeq() { return this._seq = (this._seq + 1) % 0x10000; }

  _setupIR(zclNode) {
    try {
      const ep = zclNode.endpoints[1];
      if (!ep) return;
      const orig = ep.handleFrame?.bind(ep);
      ep.handleFrame = async (cid, frame, meta) => {
        if (cid === 60672) { try { await this._onIR(frame, meta); } catch (e) { this.error('[IR]', e.message); } return; }
        if (orig) return orig(cid, frame, meta);
      };
      this.log('[IR] 0xED00 handler OK');
    } catch (e) { this.error('[IR] setup err:', e.message); }
  }

  async _onIR(frame, meta) {
    const cmd = frame?.cmdId ?? meta?.cmdId;
    this.log('[IR-RX] cmd', cmd);
    // Stub: log all frames for now, full protocol in next version
  }

  async _startLearn() {
    this.log('[IR] Start learning...');
    try {
      const ep = this.zclNode.endpoints[1];
      await ep.sendFrame(57348, 0x00, Buffer.from(JSON.stringify({ study: 0 })));
      this.log('[IR] Learn command sent');
    } catch (e) { this.error('[IR] Learn err:', e.message); }
  }

  async _sendIR(code) {
    if (!code) return;
    this.log('[IR] Sending code len:', code.length);
    try {
      const msg = JSON.stringify({ key_num: 1, delay: 300, key1: { num: 1, freq: 38000, type: 1, key_code: code } });
      const seq = this._nextSeq();
      this._irMsg = msg;
      const buf = Buffer.alloc(14);
      buf.writeUInt16BE(seq, 0);
      buf.writeUInt32BE(msg.length, 2);
      buf.writeUInt32BE(0, 6);
      buf.writeUInt16BE(0xe004, 10);
      buf.writeUInt8(0x01, 12);
      buf.writeUInt8(0x02, 13);
      const ep = this.zclNode.endpoints[1];
      await ep.sendFrame(60672, 0x00, buf);
      this.log('[IR] Send initiated seq:', seq);
    } catch (e) { this.error('[IR] Send err:', e.message); }
  }

  onDeleted() { this.log('[IR] Device deleted'); }
}

module.exports = IRRemoteDevice;

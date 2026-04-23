'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster } = require('zigbee-clusters');
const ZosungIRTransmitCluster = require('../../lib/clusters/ZosungIRTransmitCluster');
const ZosungIRControlCluster = require('../../lib/clusters/ZosungIRControlCluster');
const ZosungIRTransmitBoundCluster = require('../../lib/clusters/ZosungIRTransmitBoundCluster');
const ZosungIRControlBoundCluster = require('../../lib/clusters/ZosungIRControlBoundCluster');

// Ensure clusters are registered
try { Cluster.addCluster(ZosungIRTransmitCluster); } catch (e) {}
try { Cluster.addCluster(ZosungIRControlCluster); } catch (e) {}

/**
 * Zigbee IR Remote  Moes UFO-R11, Aubess ZXZIR-02, WMUN ZS05 (TS1201)
 *
 * Full Zosung IR protocol implementation:
 * - Cluster 0xED00 (zosungIRTransmit): chunked IR code transfer
 * - Cluster 0xE004 (zosungIRControl): learn mode + send trigger
 *
 * Send flow (from Z2M):
 *   1. Host  Device: startTransmit (cmd 0x00) with seq, length, cmd=2
 *   2. Device  Host: startTransmitAck (cmd 0x01)  echo back
 *   3. Device  Host: codeDataRequest (cmd 0x02)  ask for chunk at position
 *   4. Host  Device: codeDataResponse (cmd 0x03)  send chunk + CRC
 *   5. Repeat 3-4 until all data sent
 *   6. Host  Device: doneSending (cmd 0x04)
 *   7. Device  Host: doneReceiving (cmd 0x05)
 *
 * Learn flow:
 *   1. Host  Device: IRLearn (0xE004 cmd 0x00) with {"study":0}
 *   2. Device sends IR data back via same chunked protocol (startTransmit with cmd=1)
 *   3. Host receives chunks, reassembles full IR code
 */
class IRRemoteDevice extends ZigBeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // v5.13.3: IR remotes are USB-powered, remove battery cap
    this.log('[IR] Init Zigbee IR Remote  Zosung protocol');
    this._seq = 0;
    this._pendingSend = null;   // { msg: string, seq: number, resolve, reject }
    this._learnBuffer = null;   // { seq: number, length: number, chunks: Map, resolve }
    this._learnTimeout = null;

    // Store device info
    try {
      const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
      const mdl = this.getSetting('zb_model_id') || this.getData()?.modelId || '';
      if (mfr) await this.setSettings({ zb_manufacturer_name: mfr }).catch(() => {});
      if (mdl) await this.setSettings({ zb_model_id: mdl }).catch(() => {});
    } catch (e) {}

    this._zclNode = zclNode;
    const ep = zclNode.endpoints[1];

    // Bind IR Transmit BoundCluster (0xED00)  receive protocol messages
    try {
      ep.bind('zosungIRTransmit', new ZosungIRTransmitBoundCluster({ device: this }));
      this.log('[IR] 0xED00 BoundCluster bound');
    } catch (e) { this.log('[IR] 0xED00 bind fallback:', e.message); }

    // Bind IR Control BoundCluster (0xE004)  receive learn results
    try {
      ep.bind('zosungIRControl', new ZosungIRControlBoundCluster({ device: this }));
      this.log('[IR] 0xE004 BoundCluster bound');
    } catch (e) { this.log('[IR] 0xE004 bind fallback:', e.message); }

    // Listen for protocol events from BoundClusters
    this.on('ir.startTransmit', (d) => this._onStartTransmit(d));
    this.on('ir.startTransmitAck', (d) => this._onStartTransmitAck(d));
    this.on('ir.codeDataRequest', (d) => this._onCodeDataRequest(d));
    this.on('ir.codeDataResponse', (d) => this._onCodeDataResponse(d));
    this.on('ir.doneSending', (d) => this._onDoneSending(d));
    this.on('ir.doneReceiving', (d) => this._onDoneReceiving(d));
    this.on('ir.learnStatus', (d) => this._onLearnStatus(d));

    // Also hook raw handleFrame as fallback for clusters not bound
    const origHandleFrame = ep.handleFrame?.bind(ep );
    ep.handleFrame = async (cid, frame, meta) => {
      if (cid === 0xED00 || cid === 60672) {
        try { await this._handleRawFrame(cid, frame, meta); } catch (e) { this.error('[IR] raw frame err:', e.message); }
        return;
      }
      if (cid === 0xE004 || cid === 57348) {
        try { await this._handleRawControlFrame(cid, frame, meta); } catch (e) { this.error('[IR] raw ctrl err:', e.message); }
        return;
      }
      if (origHandleFrame) return origHandleFrame(cid, frame, meta);
    };

    // Register capabilities
    if (this.hasCapability('button.learn_ir'))
      this.registerCapabilityListener('button.learn_ir', () => this.startLearn());
    if (this.hasCapability('ir_send_code'))
      this.registerCapabilityListener('ir_send_code', (v) => this.sendIRCode(v));

    this.log('[IR] Ready  full Zosung protocol');
  }

  _nextSeq() { return this._seq = (this._seq + 1) % 0x10000; }

  // 
  // SEND IR CODE  Full chunked protocol
  // 

  async sendIRCode(code) {
    if (!code) return;
    const msg = JSON.stringify({
      key_num: 1, delay: 300,
      key1: { num: 1, freq: 38000, type: 1, key_code: code }
    });
    this.log('[IR-TX] Send IR code, msg length:', msg.length);

    return new Promise((resolve, reject) => {
      const seq = this._nextSeq();
      this._pendingSend = { msg, seq, resolve, reject };

      // Timeout after 10s
      setTimeout(() => {
        if (this._pendingSend?.seq === seq) {
          this._pendingSend = null;
          reject(new Error('IR send timeout'));
        }
      }, 10000);

      // Step 1: Send startTransmit (cmd 0x00)
      const ep = this._zclNode.endpoints[1];
      const cluster = ep.clusters.zosungIRTransmit || ep.clusters[0xED00];
      if (cluster?.startTransmit) {
        cluster.startTransmit({
          seq, length: msg.length, unk1: 0, unk2: 0xE004, unk3: 1, cmd: 2, unk4: 0
        }).catch(e => this.error('[IR-TX] startTransmit err:', e.message));
      } else {
        // Fallback: send raw frame
        this._sendRawStartTransmit(seq, msg.length).catch(e => {
          this.error('[IR-TX] raw startTransmit err:', e.message);
          this._pendingSend = null;
          reject(e);
        });
      }
    });
  }

  async _sendRawStartTransmit(seq, length) {
    const buf = Buffer.alloc(14);
    buf.writeUInt16BE(seq, 0);
    buf.writeUInt32BE(length, 2);
    buf.writeUInt32BE(0, 6);
    buf.writeUInt16BE(0xE004, 10);
    buf.writeUInt8(0x01, 12);
    buf.writeUInt8(0x02, 13);
    const ep = this._zclNode.endpoints[1];
    await ep.sendFrame(0xED00, 0x00, buf);
    this.log('[IR-TX] Raw startTransmit sent, seq:', seq);
  }

  // Device echoes back  acknowledged
  _onStartTransmitAck(data) {
    this.log('[IR-TX] startTransmitAck received, seq:', data?.seq);
  }

  // Device requests a chunk of IR data
  _onCodeDataRequest(data) {
    if (!this._pendingSend ) return;
    const { msg, seq } = this._pendingSend;
    const pos = data?.position || 0;
    const maxLen = data?.maxlen || 64;
    const chunk = msg.substring(pos, pos + maxLen);
    if (!chunk.length ) return;

    // Calculate simple CRC (sum of bytes mod 256)
    const chunkBuf = Buffer.from(chunk, 'utf8');
    let crc = 0;
    for (const b of chunkBuf) crc = (crc + b) & 0xFF;

    this.log('[IR-TX] Sending chunk pos:', pos, 'len:', chunk.length, 'crc:', crc);

    const ep = this._zclNode.endpoints[1];
    const cluster = ep.clusters.zosungIRTransmit || ep.clusters[0xED00];
    if (cluster?.codeDataResponse) {
      cluster.codeDataResponse({
        zero: 0, seq, position: pos, msgpart: chunkBuf, msgpartcrc: crc
      }).catch(e => this.error('[IR-TX] codeDataResponse err:', e.message));
    }
  }

  // Device confirms all data received
  _onDoneReceiving(data) {
    this.log('[IR-TX] doneReceiving  IR code sent successfully!');
    if (this._pendingSend) {
      this._pendingSend.resolve(true);
      this._pendingSend = null;
    }
  }

  // 
  // LEARN IR CODE  Receive chunked data from device
  // 

  async startLearn() {
    this.log('[IR-RX] Start learning...');
    return new Promise((resolve, reject) => {
      this._learnBuffer = { seq: 0, length: 0, chunks: new Map(), data: '', resolve };

      clearTimeout(this._learnTimeout);
      this._learnTimeout = setTimeout(() => {
        if (this._learnBuffer) {
          this.log('[IR-RX] Learn timeout');
          this._learnBuffer = null;
          reject(new Error('Learn timeout'));
        }
      }, 30000);

      // Send learn command via 0xE004
      const ep = this._zclNode.endpoints[1];
      const ctrl = ep.clusters.zosungIRControl || ep.clusters[0xE004];
      if (ctrl?.IRLearn) {
        ctrl.IRLearn({ data: Buffer.from(JSON.stringify({ study: 0 })) })
          .catch(e => this.error('[IR-RX] IRLearn cmd err:', e.message));
      } else {
        ep.sendFrame(0xE004, 0x00, Buffer.from(JSON.stringify({ study: 0 })))
          .catch(e => this.error('[IR-RX] IRLearn raw err:', e.message));
      }
      this.log('[IR-RX] Learn command sent  point remote at device');
      });
  }

  // Device starts sending learned IR code
  _onStartTransmit(data) {
    const cmd = data?.cmd;
    this.log('[IR-RX] startTransmit received, cmd:', cmd, 'length:', data?.length, 'seq:', data?.seq);

    if (cmd === 1 && this._learnBuffer) {
      // Learning mode: device is sending learned code
      this._learnBuffer.seq = data.seq;
      this._learnBuffer.length = data.length;
    }

    // Always ACK
    const ep = this._zclNode.endpoints[1];
    const cluster = ep.clusters.zosungIRTransmit || ep.clusters[0xED00];
    if (cluster?.startTransmitAck) {
      cluster.startTransmitAck({
        zero: 0, seq: data.seq, length: data.length,
        unk1: data.unk1 || 0, unk2: data.unk2 || 0xE004,
        unk3: data.unk3 || 1, cmd: data.cmd || 1, unk4: data.unk4 || 0
      }).catch(e => this.error('[IR-RX] ACK err:', e.message));
    }
  }

  // Receive a chunk of learned IR code
  _onCodeDataResponse(data) {
    if (!this._learnBuffer) return;
    const pos = data?.position || 0;
    const chunk = data?.msgpart;
    if (!chunk ) return;

    const chunkStr = Buffer.isBuffer(chunk) ? chunk.toString('utf8' ) : String(chunk);
    this._learnBuffer.chunks.set(pos, chunkStr);
    this.log('[IR-RX] Chunk received pos:', pos, 'len:', chunkStr.length);
  }

  // Device finished sending learned code
  _onDoneSending(data) {
    this.log('[IR-RX] doneSending received');
    clearTimeout(this._learnTimeout);

    // ACK
    const ep = this._zclNode.endpoints[1];
    const cluster = ep.clusters.zosungIRTransmit || ep.clusters[0xED00];
    if (cluster?.doneReceiving) {
      cluster.doneReceiving({ seq: data?.seq || 0, zero: 0 })
        .catch(e => this.error('[IR-RX] doneReceiving err:', e.message));
    }

    if (this._learnBuffer) {
      // Reassemble chunks in order
      const sorted = [...this._learnBuffer.chunks.entries()].sort((a, b) => a[0] - b[0]);
      const fullCode = sorted.map(([, v]) => v).join('');

      this.log('[IR-RX] Learned IR code length:', fullCode.length);

      // Extract key_code from JSON if possible
      let keyCode = fullCode;
      try {
        const parsed = JSON.parse(fullCode);
        keyCode = parsed.key1?.key_code || parsed.key_code || fullCode;
      } catch (e) { /* raw code */ }

      // Update capability
      this.setCapabilityValue('ir_learned_code', keyCode).catch(this.error);

      // Trigger flow
      const trigger = this.homey.flow.getActionCard('ir_code_received');
      if (trigger) {
        trigger.trigger(this, { ir_code: keyCode }, {})
          .catch(err => this.error('[IR-RX] Flow trigger err:', err.message));
      } else {
        this._getFlowCard('ir_code_received')?.trigger(this, {}, {})
          .catch(err => this.error('[IR-RX] Flow trigger fallback err:', err.message));
      }

      if (this._learnBuffer.resolve) this._learnBuffer.resolve(keyCode);
      this._learnBuffer = null;
    }
  }

  _onLearnStatus(data) {
    this.log('[IR-RX] Learn status:', data);
  }

  // 
  // RAW FRAME FALLBACK (for devices where BoundCluster doesn't bind)
  // 

  async _handleRawFrame(cid, frame, meta) {
    const cmd = frame?.cmdId ?? meta?.cmdId ?? frame?.[0];
    this.log('[IR-RAW] 0xED00 cmd:', cmd);
    // Forward to appropriate handler based on command ID
    if (cmd === 0x00) this._onStartTransmit(this._parseTransmitFrame(frame));
    else if (cmd === 0x01) this._onStartTransmitAck(this._parseTransmitFrame(frame));
    else if (cmd === 0x02) this._onCodeDataRequest(this._parseRequestFrame(frame));
    else if (cmd === 0x03) this._onCodeDataResponse(this._parseResponseFrame(frame));
    else if (cmd === 0x04) this._onDoneSending(frame);
    else if (cmd === 0x05) this._onDoneReceiving(frame);
  }

  async _handleRawControlFrame(cid, frame, meta) {
    const cmd = frame?.cmdId ?? meta?.cmdId ?? frame?.[0];
    this.log('[IR-RAW] 0xE004 cmd:', cmd);
    this._onLearnStatus({ cmd, frame });
  }

  _parseTransmitFrame(f) {
    if (!f || !f.data) return f;
    const d = f.data;
    return { seq: d.readUInt16BE?.(0 ) || 0, length: d.readUInt32BE?.(2 ) || 0, cmd: d[12] || 0 };
  }

  _parseRequestFrame(f) {
    if (!f || !f.data) return f;
    const d = f.data;
    return { seq: d.readUInt16BE?.(0 ) || 0, position: d.readUInt16BE?.(2 ) || 0, maxlen: d[4] || 64 };
  }

  _parseResponseFrame(f) {
    if (!f || !f.data) return f;
    const d = f.data;
    const pos = d.readUInt16BE?.(3 ) || 0;
    const chunk = d.slice(5, -1);
    return { position: pos, msgpart: chunk, msgpartcrc: d[d.length - 1] };
  }

  onDeleted() { this.log('[IR] Device deleted'); }
}

module.exports = IRRemoteDevice;

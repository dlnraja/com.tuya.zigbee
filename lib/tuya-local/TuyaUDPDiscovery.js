const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');
'use strict';

const dgram = require('dgram');
const { EventEmitter } = require('events');
const {
  decryptUdpEcb,
  decryptUdpGcm,
  stripUdpFrame,
  buildActiveProbePayload,
} = require('./UdpDiscoveryKeys');

class TuyaUDPDiscovery extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._devices = new Map();
    this._sockets = [];
    this._running = false;
    this._cleanupInterval = null;
    this._log = opts.log || (() => {});
    this._deviceTTL = opts.deviceTTL || 120000;
    this._destroyed = false;
    this._probeInterval = opts.probeInterval || 300000; // 5 min active scan (TinyTuya pattern)
    this._probeTimer = null;
  }

  get devices() {
    const now = Date.now();
    const result = [];
    for (const [id, entry] of this._devices) {
      if (now - entry.lastSeen < this._deviceTTL) {
        result.push({ ...entry.info, lastSeen: entry.lastSeen });
      }
    }
    return result;
  }

  async start() {
    if (this._running) {return;}
    this._running = true;
    this._destroyed = false;
    this._log('[UDP-DISC] Starting Tuya UDP discovery on ports 6666/6667/6668/7000...');
    try {
      await this._bindSocket(6666, false, false);
      await this._bindSocket(6667, true, false);
      await this._bindSocket(6668, true, true);
      // v9.0.405: port 7000 — TinyTuya documents it for legacy 3.1 broadcasts
      await this._bindSocket(7000, false, false);
    } catch (err) {
      this._log('[UDP-DISC] Bind error (non-fatal):', err.message);
    }
    // v9.0.40: Use native setInterval (no homey dependency required)
    this._cleanupInterval = globalThis.setInterval(() => { if (this._destroyed) {return;} this._cleanup(); }, 60000);
    this._cleanupInterval.unref?.();
    this._startActiveProbe();
    this._log('[UDP-DISC] Discovery active');
  }

  /** TinyTuya-style active broadcast to wake silent devices on LAN */
  _startActiveProbe() {
    if (this._probeTimer) { return; }
    const run = () => {
      if (this._destroyed || !this._running) { return; }
      this._sendActiveProbe().catch(() => {});
    };
    run();
    this._probeTimer = globalThis.setInterval(run, this._probeInterval);
    this._probeTimer.unref?.();
  }

  async _sendActiveProbe() {
    const payload = Buffer.from(buildActiveProbePayload('255.255.255.255'));
    for (const sock of this._sockets) {
      try {
        sock.send(payload, 6666, '255.255.255.255');
        sock.send(payload, 6667, '255.255.255.255');
      } catch { /* non-fatal */ }
    }
  }

  _bindSocket(port, encrypted, gcm) {
    return new Promise((resolve) => {
      let timer = null;
      let settled = false;
      const done = () => {
        if (settled) {return;}
        settled = true;
        if (timer) {clearTimeout(timer);}
        resolve();
      };
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('error', (err) => {
        this._log(`[UDP-DISC] Socket error port ${  port  }:`, err.message);
        try { sock.close(); } catch (e) { /* socket cleanup on error */ }
        done();
      });
      sock.on('message', (msg, rinfo) => {
        try { this._handleMessage(msg, rinfo, encrypted, gcm); }
        catch (e) { /* ignore malformed */ }
      });
      sock.bind(port, () => {
        try { sock.setBroadcast(true); } catch (e) { /* broadcast not critical */ }
        this._sockets.push(sock);
        const label = gcm ? ' (GCM/3.5)' : encrypted ? ' (ECB)' : ' (plaintext)';
        this._log(`[UDP-DISC] Listening on port ${  port  }${label}`);
        done();
      });
      timer = safeSetTimeout(done, 3000);
      timer.unref?.();
    });
  }

  _handleMessage(msg, rinfo, encrypted, gcm) {
    // v5.11.16 SEC: Reject undersized and oversized packets (DoS prevention)
    if (msg.length < 28 || msg.length > 4096) {return;}
    let payload;
    const raw = stripUdpFrame(msg);
    if (encrypted && gcm) {
      payload = decryptUdpGcm(raw);
      if (!payload) { return; }
    } else if (encrypted) {
      payload = decryptUdpEcb(raw);
      if (!payload) { return; }
    } else {
      const dataStart = msg.indexOf('{');
      const dataEnd = msg.lastIndexOf('}');
      if (dataStart >= 0 && dataEnd > dataStart) {
        payload = msg.slice(dataStart, dataEnd + 1).toString('utf8');
      } else {
        payload = raw.toString('utf8');
      }
    }
    payload = payload.replace(/[\x00-\x1f]/g, '').trim();
    if (!payload.startsWith('{')) {return;}
    let info;
    try { info = JSON.parse(payload); } catch { return; }
    if (!info.gwId) {return;}
    const deviceId = info.gwId;
    const existing = this._devices.get(deviceId);
    const deviceInfo = {
      deviceId: deviceId,
      ip: info.ip || rinfo.address,
      version: info.version || '3.3',
      productKey: info.productKey || '',
      encrypted: !!info.encrypt,
      active: info.active,
    };
    this._devices.set(deviceId, { info: deviceInfo, lastSeen: Date.now() });
    if (!existing) {
      this._log(`[UDP-DISC] New device: ${  deviceId  } @ ${  deviceInfo.ip  } v${  deviceInfo.version}`);
      this.emit('device-found', deviceInfo);
    } else if (existing.info.ip !== deviceInfo.ip) {
      this._log(`[UDP-DISC] IP changed: ${  deviceId  } ${  existing.info.ip  } -> ${  deviceInfo.ip}`);
      this.emit('device-updated', deviceInfo);
    }
  }

  _cleanup() {
    const now = Date.now();
    for (const [id, entry] of this._devices) {
      if (now - entry.lastSeen > this._deviceTTL) {
        this._devices.delete(id);
        this.emit('device-lost', entry.info);
      }
    }
  }

  getDevice(deviceId) {
    const entry = this._devices.get(deviceId);
    return entry ? { ...entry.info, lastSeen: entry.lastSeen } : null;
  }

  async stop() {
    this._running = false;
    this._destroyed = true;
    if (this._probeTimer) { clearInterval(this._probeTimer); this._probeTimer = null; }
    if (this._cleanupInterval) { clearInterval(this._cleanupInterval); this._cleanupInterval = null; }
    for (const sock of this._sockets) {
      try { sock.close(); } catch (e) { /* cleanup - safe to ignore */ }
    }
    this._sockets = [];
    this._log('[UDP-DISC] Stopped');
  }
}

module.exports = TuyaUDPDiscovery;

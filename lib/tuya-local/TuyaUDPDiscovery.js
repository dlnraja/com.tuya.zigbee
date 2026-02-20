'use strict';

const dgram = require('dgram');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// NOTE: This is a well-known Tuya protocol constant used by ALL Tuya devices for UDP discovery.
// It is NOT a secret — it is published in the Tuya protocol specification and used by Z2M, tuyapi, etc.
const UDP_KEY = Buffer.from('yGAdlopoPVldABfn');
const UDP_KEY_35 = crypto.createHash('md5').update('yGAdlopoPVldABfn', 'utf8').digest();
const PREFIX = Buffer.from([0x00, 0x00, 0x55, 0xAA]);
const SUFFIX = Buffer.from([0x00, 0x00, 0xAA, 0x55]);

class TuyaUDPDiscovery extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._devices = new Map();
    this._sockets = [];
    this._running = false;
    this._cleanupInterval = null;
    this._log = opts.log || (() => {});
    this._deviceTTL = opts.deviceTTL || 120000;
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
    if (this._running) return;
    this._running = true;
    this._log('[UDP-DISC] Starting Tuya UDP discovery on ports 6666/6667/6668...');
    try {
      await this._bindSocket(6666, false, false);
      await this._bindSocket(6667, true, false);
      await this._bindSocket(6668, true, true);
    } catch (err) {
      this._log('[UDP-DISC] Bind error (non-fatal):', err.message);
    }
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
    this._log('[UDP-DISC] Discovery active');
  }

  _bindSocket(port, encrypted, gcm) {
    return new Promise((resolve, reject) => {
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('error', (err) => {
        this._log('[UDP-DISC] Socket error port ' + port + ':', err.message);
        try { sock.close(); } catch (e) {}
        resolve();
      });
      sock.on('message', (msg, rinfo) => {
        try { this._handleMessage(msg, rinfo, encrypted, gcm); }
        catch (e) { /* ignore malformed */ }
      });
      sock.bind(port, () => {
        try { sock.setBroadcast(true); } catch (e) {}
        this._sockets.push(sock);
        const label = gcm ? ' (GCM/3.5)' : encrypted ? ' (ECB)' : ' (plaintext)';
        this._log('[UDP-DISC] Listening on port ' + port + label);
        resolve();
      });
      setTimeout(() => resolve(), 3000);
    });
  }

  _handleMessage(msg, rinfo, encrypted, gcm) {
    // v5.11.16 SEC: Reject undersized and oversized packets (DoS prevention)
    if (msg.length < 28 || msg.length > 4096) return;
    let payload;
    const hasPfx = msg.slice(0, 4).equals(PREFIX);
    const dataStart = hasPfx ? 20 : 0;
    const hasSfx = msg.length >= 8 && msg.slice(-8).slice(4).equals(SUFFIX);
    const dataEnd = hasSfx ? msg.length - 8 : msg.length;
    const raw = msg.slice(dataStart, dataEnd);
    if (encrypted && gcm) {
      try {
        if (raw.length < 28) return;
        const iv = raw.slice(0, 12);
        const tag = raw.slice(-16);
        const ct = raw.slice(12, raw.length - 16);
        const d = crypto.createDecipheriv('aes-128-gcm', UDP_KEY_35, iv);
        d.setAuthTag(tag);
        payload = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
      } catch (e) { return; }
    } else if (encrypted) {
      try {
        const d = crypto.createDecipheriv('aes-128-ecb', UDP_KEY, null);
        payload = Buffer.concat([d.update(raw), d.final()]).toString('utf8');
      } catch (e) { return; }
    } else {
      payload = raw.toString('utf8');
    }
    payload = payload.replace(/[\x00-\x1f]/g, '').trim();
    if (!payload.startsWith('{')) return;
    const info = JSON.parse(payload);
    if (!info.gwId) return;
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
      this._log('[UDP-DISC] New device: ' + deviceId + ' @ ' + deviceInfo.ip + ' v' + deviceInfo.version);
      this.emit('device-found', deviceInfo);
    } else if (existing.info.ip !== deviceInfo.ip) {
      this._log('[UDP-DISC] IP changed: ' + deviceId + ' ' + existing.info.ip + ' -> ' + deviceInfo.ip);
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
    if (this._cleanupInterval) { clearInterval(this._cleanupInterval); this._cleanupInterval = null; }
    for (const sock of this._sockets) {
      try { sock.close(); } catch (e) {}
    }
    this._sockets = [];
    this._log('[UDP-DISC] Stopped');
  }
}

module.exports = TuyaUDPDiscovery;
